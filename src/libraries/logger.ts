import { Logger } from '@dvsa/azure-logger';
import { CustomAxiosError } from '@dvsa/azure-logger/dist/interfaces';

import { config } from '../config';

enum BusinessTelemetryEvents {
  NOT_WHITELISTED_URL_CALL = 'NOT_WHITELISTED_URL_CALL',
  BCP_BOOKING_IDENTIFICATION_SUCCEEDED = 'BCP_BOOKING_IDENTIFICATION_SUCCEEDED',
  BCP_BOOKING_IDENTIFICATION_FAILED = 'BCP_BOOKING_IDENTIFICATION_FAILED',

  BCP_BOOKED_SLOT_CRM_CANCELLATION_FAILED = 'BCP_BOOKED_SLOT_CRM_CANCELLATION_FAILED', // Failed to process the booked slot
  BCP_BOOKED_SLOT_CRM_CANCELLATION_SUCCEEDED = 'BCP_BOOKED_SLOT_CRM_CANCELLATION_SUCCEEDED', // Succeeded to process the booked slot
  BCP_BOOKING_CRM_CANCELLATION_FAILED = 'BCP_BOOKING_CRM_CANCELLATION_FAILED', // Failed in cancelling and marking the booking in CRM
  BCP_BOOKING_CRM_CANCELLATION_SUCCEEDED = 'BCP_BOOKING_CRM_CANCELLATION_SUCCEEDED', // Succeeded in cancelling and marking the booking in CRM

  BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED = 'BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED',
  BCP_BOOKING_PROCESSING_NOTIFICATION_NOT_POSSIBLE = 'BCP_BOOKING_PROCESSING_NOTIFICATION_NOT_POSSIBLE', // Not possible to contact the candidate as no email or valid postal address.
  BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED = 'BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED',
  BCP_BOOKING_TCN_CANCELLATION_FAILED = 'BCP_BOOKING_TCN_CANCELLATION_FAILED', // Failed in cancelling  the slot in TCN
  BCP_BOOKING_TCN_CANCELLATION_SUCCEEDED = 'BCP_BOOKING_TCN_CANCELLATION_SUCCEEDED', // Succeeded in cancelling  the slot in TCN

  BCP_FINISHED_CANDIDATE_BOOKING_PROCESSING = 'BCP_FINISHED_CANDIDATE_BOOKING_PROCESSING', // Finished processing candidate bookings
  BCP_FINISHED_TRAINER_BOOKER_BOOKING_PROCESSING = 'BCP_FINISHED_TRAINER_BOOKER_BOOKING_PROCESSING', // Finished processing the trainer booker bookings

  BCP_FUNCTION_TIMEOUT_NEARLY_REACHED = 'BCP_FUNCTION_TIMEOUT_NEARLY_REACHED', // Function execution time reached timeout buffer

  BCP_NOTIFICATION_AUTH_ISSUE = 'BCP_NOTIFICATION_AUTH_ISSUE', // BCP function gets 401 or 403 response from Notification API
  BCP_NOTIFICATION_ERROR = 'BCP_NOTIFICATION_ERROR', // BCP function gets 5** response from Notification API
  BCP_NOTIFICATION_REQUEST_ISSUE = 'BCP_NOTIFICATION_REQUEST_ISSUE', // BCP function gets other 4** response from Notification API

  BCP_SKIPPED_CANDIDATE_BOOKINGS = 'BCP_SKIPPED_CANDIDATE_BOOKINGS', // ignoreCandidateBookings flag was set to true in the job descriptor file
  BCP_SKIPPED_TRAINER_BOOKER_BOOKINGS = 'BCP_SKIPPED_TRAINER_BOOKER_BOOKINGS', // ignoreTrainerBookerBookings flag was set to true in the job descriptor file
}

const logger = new Logger('FTTS', config.websiteSiteName);

export {
  BusinessTelemetryEvents,
  CustomAxiosError,
  logger,
};
