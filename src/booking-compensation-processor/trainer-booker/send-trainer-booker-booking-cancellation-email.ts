import groupBy from 'lodash.groupby';
import findLast from 'lodash.findlast';

import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { TrainerBookerBooking } from '../../services/crm/types/bookings';
import { buildTrainerBookerBookingCancellationEmailContent } from '../../services/notification/content/builders';
import { NotificationsClient } from '../../services/notification/notification-client';
import { JobDescriptor } from '../../types';
import { Target } from '../../services/notification/types/enums';

export const sendTrainerBookerBookingCancellationEmail = async (
  organisationId: string,
  bookings: TrainerBookerBooking[],
  jobDescriptor: JobDescriptor,
  notificationClient: NotificationsClient,
): Promise<void> => {
  const bookingsGroupedByBookedSlotId = groupBy(
    bookings,
    'bookedSlotId',
  );
  const organisationEmail = findLast(
    bookings,
    (booking) => !!booking.organisationEmail,
  )?.organisationEmail;
  try {
    if (!organisationEmail) {
      throw new Error(
        'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: \'organisationEmail\' is not defined',
      );
    }
    const emailContent = await buildTrainerBookerBookingCancellationEmailContent(
      bookingsGroupedByBookedSlotId,
      jobDescriptor.businessCancelReason,
    );
    await notificationClient.sendEmail(
      organisationEmail,
      emailContent,
      organisationId,
      Target.GB,
    );
    logger.event(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email success', {
        organisationId,
        type: 'Email',
      },
    );
  } catch (error) {
    logger.error(
      error as Error,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email failed', {
        organisationId,
        type: 'Email',
      },
    );
    logger.event(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email failed', {
        organisationId,
        type: 'Email',
      },
    );
    throw error;
  }
};
