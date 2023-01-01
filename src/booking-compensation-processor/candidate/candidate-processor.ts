/* eslint-disable no-restricted-syntax, no-await-in-loop */
import dayjs from 'dayjs';
import { config } from '../../config';
import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { AzureBlobClient } from '../../services/azure-blob-client';
import { CrmClient } from '../../services/crm/crm-client';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { OriginType } from '../../services/crm/types/enums';
import { NotificationsClient } from '../../services/notification/notification-client';
import { SchedulingClient } from '../../services/scheduling/scheduling-client';
import { JobDescriptor, JobResult } from '../../types';
import { getBookingIdentifiers, getBulkBookingsIdentifiers } from '../../utils/identifiers';
import { executionTimeoutNearlyReached } from '../../utils/time';
import { sendCandidateBookingCancellationNotification } from './send-candidate-booking-cancellation-notification';
import { writeCandidateBookingsToCsv, writeNsaOrNoEmailBookingsToCsv } from './write-candidate-bookings-to-csv';

export class CandidateProcessor {
  constructor(
    private azureBlobClient = new AzureBlobClient(),
    private crmClient = new CrmClient(),
    private notificationClient = new NotificationsClient(),
    private schedulingClient = new SchedulingClient(),
  ) { }

  public async processJob(jobName: string, jobDescriptor: JobDescriptor, targetDirectory: string, executionStartDateTime: Date): Promise<JobResult> {
    const testCentreIds = !jobDescriptor.allTestCentres ? jobDescriptor.testCentreIds : undefined;
    const candidateBookings = await this.crmClient.getBookingsByOrigin<CandidateBooking>(OriginType.CANDIDATE, jobDescriptor.dateFrom, jobDescriptor.dateTo, testCentreIds);
    logger.debug('CandidateProcessor::processJob: retrieved candidate bookings', {
      bookings: candidateBookings,
      ...getBulkBookingsIdentifiers(candidateBookings),
    });

    if (jobDescriptor.dryRun) {
      await writeCandidateBookingsToCsv(candidateBookings, targetDirectory, this.azureBlobClient);
      return {
        jobFinished: true,
      };
    }

    await writeNsaOrNoEmailBookingsToCsv(candidateBookings, targetDirectory, this.azureBlobClient);

    for (const booking of candidateBookings) {
      if (executionTimeoutNearlyReached(executionStartDateTime, config.functionTimeout, config.functionTimeoutBuffer)) {
        logger.event(BusinessTelemetryEvents.BCP_FUNCTION_TIMEOUT_NEARLY_REACHED, 'CandidateProcessor::processJob: Function timeout nearly reached', {
          jobName,
          executionStartDateTime,
          functionTimeoutSeconds: config.functionTimeout,
          functionTimeoutBufferSeconds: config.functionTimeoutBuffer,
        });
        return {
          jobFinished: false,
          reason: 'Candidate job - function timeout nearly reached',
        };
      }

      // Notifications
      try {
        await sendCandidateBookingCancellationNotification(jobDescriptor, this.notificationClient, booking);
      } catch (error) {
        logger.error(error, `CandidateProcessor::processJob: Failed to send cancellation notification - ${(error as Error).message}`, {
          ...getBookingIdentifiers(booking),
        });
      }

      // Scheduling
      let updatedTCN = false;
      if (dayjs(booking.testDate).isAfter(dayjs())) {
        try {
          await this.schedulingClient.deleteBooking(booking);
          updatedTCN = true;
          logger.event(BusinessTelemetryEvents.BCP_BOOKING_TCN_CANCELLATION_SUCCEEDED, 'CandidateProcessor::processJob: Successfully cancelled booking with TCN', {
            ...getBookingIdentifiers(booking),
          });
        } catch (error) {
          logger.event(BusinessTelemetryEvents.BCP_BOOKING_TCN_CANCELLATION_FAILED, 'CandidateProcessor::processJob: Failed to cancel booking with TCN', {
            ...getBookingIdentifiers(booking),
            error: error as Error,
          });
        }
      }

      // CRM
      try {
        await this.crmClient.markBookingAsCompensated(booking, jobDescriptor.cancelReasonCode, updatedTCN);
        logger.event(BusinessTelemetryEvents.BCP_BOOKING_CRM_CANCELLATION_SUCCEEDED, 'CandidateProcessor::processJob: Successfully cancelled booking with CRM', {
          ...getBookingIdentifiers(booking),
        });
      } catch (error) {
        logger.event(BusinessTelemetryEvents.BCP_BOOKING_CRM_CANCELLATION_FAILED, 'CandidateProcessor::processJob: Failed to update CRM', {
          ...getBookingIdentifiers(booking),
          error: error as Error,
        });
      }
    }

    return {
      jobFinished: true,
    };
  }
}
