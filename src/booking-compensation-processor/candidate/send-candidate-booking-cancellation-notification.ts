/* eslint-disable no-await-in-loop, no-restricted-syntax */
import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { JobDescriptor } from '../../types';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { GovernmentAgency } from '../../services/crm/types/enums';
import { buildCandidateBookingCancellationEmailContent, buildCandidateBookingCancellationLetterContent } from '../../services/notification/content/builders';
import { NotificationsClient } from '../../services/notification/notification-client';
import { getBookingIdentifiers } from '../../utils/identifiers';
import { mapToLetterAddress } from '../../utils/map-address';
import { validatePostalAddress } from '../../utils/validation/validate-postal-address';
import { Target } from '../../services/notification/types/enums';

export const sendCandidateBookingCancellationNotification = async (
  jobDescriptor: JobDescriptor,
  notificationClient: NotificationsClient,
  booking: CandidateBooking,
): Promise<void> => {
  const target = booking.governmentAgency === GovernmentAgency.DVA ? Target.NI : Target.GB;
  booking.cancellationReason = jobDescriptor.businessCancelReason;
  const bookingIdentifiers = getBookingIdentifiers(booking);
  if (booking.candidateEmail) {
    try {
      const emailContent = await buildCandidateBookingCancellationEmailContent(booking, target);
      await notificationClient.sendEmail(booking.candidateEmail, emailContent, booking.bookingReference, target);
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED, 'sendCandidateBookingCancellationNotification: Sending email success', {
        ...bookingIdentifiers,
        type: 'Email',
      });
    } catch (error) {
      logger.error(error, 'sendCandidateBookingCancellationNotification: Sending email failed', {
        ...bookingIdentifiers,
        type: 'Email',
      });
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED, 'sendCandidateBookingCancellationNotification: Sending email failed', {
        ...bookingIdentifiers,
        type: 'Email',
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
        type: 'Letter',
      });
    } catch (error) {
      logger.error(error as Error, 'sendCandidateBookingCancellationNotification: Sending letter failed', {
        ...bookingIdentifiers,
        type: 'Letter',
      });
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED, 'sendCandidateBookingCancellationNotification: Sending letter failed', {
        ...bookingIdentifiers,
        type: 'Letter',
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
