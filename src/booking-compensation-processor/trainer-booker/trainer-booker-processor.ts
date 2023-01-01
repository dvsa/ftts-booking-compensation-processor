/* eslint-disable no-await-in-loop, guard-for-in, no-restricted-syntax */
import groupBy from 'lodash.groupby';
import { config } from '../../config';
import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { AzureBlobClient } from '../../services/azure-blob-client';
import { CrmClient } from '../../services/crm/crm-client';
import { TrainerBookerBooking } from '../../services/crm/types/bookings';
import { OriginType, TriggerAction } from '../../services/crm/types/enums';
import { NotificationsClient } from '../../services/notification/notification-client';
import { JobDescriptor, JobResult } from '../../types';
import { getBulkBookingsIdentifiers } from '../../utils/identifiers';
import { executionTimeoutNearlyReached } from '../../utils/time';
import { sendTrainerBookerBookingCancellationEmail } from './send-trainer-booker-booking-cancellation-email';
import { writeTrainerBookingsToCsv } from './write-trainer-bookings-to-csv';

export class TrainerBookerProcessor {
  constructor(
    private crmClient = new CrmClient(),
    private notificationClient = new NotificationsClient(),
    private azureBlobClient = new AzureBlobClient(),
  ) { }

  public async processJob(jobName: string, jobDescriptor: JobDescriptor, targetDirectory: string, executionStartDateTime: Date): Promise<JobResult> {
    const trainerBookerBookings = await this.crmClient.getBookingsByOrigin<TrainerBookerBooking>(
      OriginType.TRAINER_BOOKER,
      jobDescriptor.dateFrom,
      jobDescriptor.dateTo,
      !jobDescriptor.allTestCentres ? jobDescriptor.testCentreIds : undefined,
    );
    logger.debug('TrainerBookerProcessor::processJob: trainer booker bookings', {
      trainerBookerBookings,
      ...getBulkBookingsIdentifiers(trainerBookerBookings),
    });

    if (jobDescriptor.dryRun) {
      await writeTrainerBookingsToCsv(trainerBookerBookings, targetDirectory, this.azureBlobClient);
      return {
        jobFinished: true,
      };
    }

    const bookingsGroupedByOrganisationId = groupBy(
      trainerBookerBookings,
      'organisationId',
    );

    for (const organisationId in bookingsGroupedByOrganisationId) {
      if (executionTimeoutNearlyReached(executionStartDateTime, config.functionTimeout, config.functionTimeoutBuffer)) {
        logger.event(BusinessTelemetryEvents.BCP_FUNCTION_TIMEOUT_NEARLY_REACHED, 'TrainerBookerProcessor::processJob: Function timeout nearly reached', {
          jobName,
          executionStartDateTime,
          functionTimeoutSeconds: config.functionTimeout,
          functionTimeoutBufferSeconds: config.functionTimeoutBuffer,
        });
        return {
          jobFinished: false,
          reason: 'Trainer booker job - function timeout nearly reached',
        };
      }

      try {
        // ensures an array bookings can be safely accessed according to the organisationId
        if (Object.prototype.hasOwnProperty.call(bookingsGroupedByOrganisationId, organisationId)) {
          // eslint-disable-next-line security/detect-object-injection
          const bookings = bookingsGroupedByOrganisationId[organisationId];
          await sendTrainerBookerBookingCancellationEmail(organisationId, bookings, jobDescriptor, this.notificationClient);

          const bookedSlotIds = bookings.map((booking) => booking.bookedSlotId).filter(Boolean);
          if (bookedSlotIds.length > 0) {
            const uniqueBookedSlotsIds = [...new Set(bookedSlotIds)];
            await this.crmClient.batchUpdateBookedSlotTriggerAction(uniqueBookedSlotsIds, TriggerAction.CANCEL_WITH_OWED_COMPENSATION_CHANGE, jobDescriptor.cancelReasonCode);
          } else {
            logger.warn('TrainerBookerProcessor::processJob: No booked slots for the given bookings', {
              organisationId,
              ...getBulkBookingsIdentifiers(bookings),
            });
          }
        }
      } catch (error) {
        logger.error(error as Error, `TrainerBookerProcessor::processJob: Failed to process trainer booker bookings - ${(error as Error).message}`, {
          organisationId,
        });
      }
    }

    return {
      jobFinished: true,
    };
  }
}
