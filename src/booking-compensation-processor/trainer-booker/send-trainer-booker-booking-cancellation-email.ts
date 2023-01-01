import groupBy from 'lodash.groupby';
import findLast from 'lodash.findlast';

import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { TrainerBookerBooking } from '../../services/crm/types/bookings';
import { buildTrainerBookerBookingCancellationEmailContent } from '../../services/notification/content/builders';
import { NotificationsClient } from '../../services/notification/notification-client';
import { JobDescriptor } from '../../types';
import { Target } from '../../services/notification/types/enums';
import { config } from '../../config';
import { BookingCategory, Channel } from '../../services/crm/types/enums';

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
        'BookingCompensationProcessor::sendTrainerBookerBookingNotification: \'organisationEmail\' is not defined',
      );
    }

    if (config.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForTrainer) {
      // TODO: Technical approach TBD: https://dvsa.atlassian.net/browse/FTT-20118
      await notificationClient.sendNotification(
        bookings[0],
        Target.GB,
        BookingCategory.STANDARD_TRAINER_BOOKER_BOOKING_CANCELLATION,
        organisationEmail,
      );
      logger.event(
        BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
        'BookingCompensationProcessor::sendTrainerBookerBookingCancellationNotification: Sending notification success', {
          organisationId,
          channel: Channel.email,
          bookingId: bookings[0].bookingId,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductReference: bookings[0].bookingProductReference,
          bookingReference: bookings[0].bookingReference,
        },
      );
      return;
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
        channel: Channel.email,
        bookingId: bookings[0].bookingId,
        bookingProductId: bookings[0].bookingProductId,
        bookingProductReference: bookings[0].bookingProductReference,
        bookingReference: bookings[0].bookingReference,
      },
    );
  } catch (error) {
    logger.error(
      error as Error,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email failed', {
        organisationId,
        channel: Channel.email,
        bookingId: bookings[0].bookingId,
        bookingProductId: bookings[0].bookingProductId,
        bookingProductReference: bookings[0].bookingProductReference,
        bookingReference: bookings[0].bookingReference,
      },
    );
    logger.event(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email failed', {
        organisationId,
        channel: Channel.email,
        bookingId: bookings[0].bookingId,
        bookingProductId: bookings[0].bookingProductId,
        bookingProductReference: bookings[0].bookingProductReference,
        bookingReference: bookings[0].bookingReference,
      },
    );
    throw error;
  }
};
