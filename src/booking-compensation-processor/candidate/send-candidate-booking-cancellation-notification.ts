/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { JobDescriptor } from '../../types';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { GovernmentAgency, BookingCategory, Channel } from '../../services/crm/types/enums';
import { buildCandidateBookingCancellationEmailContent, buildCandidateBookingCancellationLetterContent } from '../../services/notification/content/builders';
import { NotificationsClient } from '../../services/notification/notification-client';
import { getBookingIdentifiers } from '../../utils/identifiers';
import { mapToLetterAddress } from '../../utils/map-address';
import { validatePostalAddress } from '../../utils/validation/validate-postal-address';
import { Target } from '../../services/notification/types/enums';
import { config } from '../../config';

export const sendCandidateBookingCancellationNotification = async (
  jobDescriptor: JobDescriptor,
  notificationClient: NotificationsClient,
  booking: CandidateBooking,
): Promise<void> => {
  const target = booking.governmentAgency === GovernmentAgency.DVA ? Target.NI : Target.GB;
  booking.cancellationReason = jobDescriptor.businessCancelReason;
  const bookingIdentifiers = getBookingIdentifiers(booking);

  if (config.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForCandidate) {
    const channel = booking.candidateEmail ? 'email' : 'letter' as Channel;
    try {
      await notificationClient.sendNotification(
        booking,
        target,
        BookingCategory.STANDARD_CANDIDATE_BOOKING_CANCELLATION,
      );
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED, 'sendCandidateBookingCancellationNotification: Sending notification success', {
        ...bookingIdentifiers,
        channel,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
    } catch (error) {
      logger.error(error, 'sendCandidateBookingCancellationNotification: Sending notification failed', {
        ...bookingIdentifiers,
        channel,
      });
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED, 'sendCandidateBookingCancellationNotification: Sending notification failed', {
        ...bookingIdentifiers,
        channel,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
      throw error;
    }
    return;
  }

  if (booking.candidateEmail) {
    try {
      const emailContent = await buildCandidateBookingCancellationEmailContent(booking, target);
      await notificationClient.sendEmail(booking.candidateEmail, emailContent, booking.bookingReference, target);
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED, 'sendCandidateBookingCancellationNotification: Sending email success', {
        ...bookingIdentifiers,
        channel: Channel.email,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
    } catch (error) {
      logger.error(error, 'sendCandidateBookingCancellationNotification: Sending email failed', {
        ...bookingIdentifiers,
        channel: Channel.email,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED, 'sendCandidateBookingCancellationNotification: Sending email failed', {
        ...bookingIdentifiers,
        channel: Channel.email,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
      throw error;
    }
  } else if (validatePostalAddress(booking)) {
    try {
      const address = mapToLetterAddress(booking);
      const letterContent = await buildCandidateBookingCancellationLetterContent(booking, target);
      await notificationClient.sendLetter(address, letterContent, booking.bookingReference, target);
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED, 'sendCandidateBookingCancellationNotification: Sending letter success', {
        ...bookingIdentifiers,
        channel: Channel.letter,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
    } catch (error) {
      logger.error(error as Error, 'sendCandidateBookingCancellationNotification: Sending letter failed', {
        ...bookingIdentifiers,
        channel: Channel.letter,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED, 'sendCandidateBookingCancellationNotification: Sending letter failed', {
        ...bookingIdentifiers,
        channel: Channel.letter,
        bookingId: booking.bookingId,
        bookingProductId: booking.bookingProductId,
        bookingProductReference: booking.bookingProductReference,
        bookingReference: booking.bookingReference,
      });
      throw error;
    }
  } else {
    logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_NOT_POSSIBLE, 'sendCandidateBookingCancellationNotification: No valid email or postal address', {
      ...bookingIdentifiers,
    });
    throw Error('sendCandidateBookingCancellationNotification: Not possible to send email or letter - no valid email or postal address');
  }
};
