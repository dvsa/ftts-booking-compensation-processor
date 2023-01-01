import { mocked } from 'ts-jest/utils';
import MockDate from 'mockdate';
import { CandidateProcessor } from '../../../../src/booking-compensation-processor/candidate/candidate-processor';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { JobDescriptor, JobResult, JsonObject } from '../../../../src/types';
import { buildMockJobDescriptor, mockTestCentreIds } from '../../../stubs/job-descriptor.mock';
import { OriginType } from '../../../../src/services/crm/types/enums';
import { AzureBlobClient } from '../../../../src/services/azure-blob-client';
import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { SchedulingClient } from '../../../../src/services/scheduling/scheduling-client';
import { sendCandidateBookingCancellationNotification } from '../../../../src/booking-compensation-processor/candidate/send-candidate-booking-cancellation-notification';
import { writeCandidateBookingsToCsv, writeNsaOrNoEmailBookingsToCsv } from '../../../../src/booking-compensation-processor/candidate/write-candidate-bookings-to-csv';
import { buildMockCandidateBookings } from '../../../stubs/candidate-booking.mock';
import { CandidateBooking } from '../../../../src/services/crm/types/bookings';
import { BusinessTelemetryEvents, logger } from '../../../../src/libraries/logger';
import { executionTimeoutNearlyReached } from '../../../../src/utils/time';
import { config } from '../../../../src/config';

jest.mock('../../../../src/services/azure-blob-client');
const mockedAzureBlobClient = mocked(new AzureBlobClient());

jest.mock('../../../../src/services/crm/crm-client');
const mockedCrmClient = mocked(new CrmClient());

jest.mock('../../../../src/services/notification/notification-client');
const mockedNotificationsClient = mocked(new NotificationsClient());

jest.mock('../../../../src/services/scheduling/scheduling-client');
const mockedSchedulingClient = mocked(new SchedulingClient());

jest.mock('../../../../src/libraries/logger');
const mockedLogger = mocked(logger, true);

jest.mock('../../../../src/config');
const mockedConfig = mocked(config, true);

jest.mock('../../../../src/booking-compensation-processor/candidate/send-candidate-booking-cancellation-notification');
const mockedSendCandidateBookingCancellationNotification = mocked(sendCandidateBookingCancellationNotification);

jest.mock('../../../../src/booking-compensation-processor/candidate/candidate-csv-writer');
jest.mock('../../../../src/booking-compensation-processor/candidate/write-candidate-bookings-to-csv');
const mockedWriteNsaOrNoEmailBookingsToCsv = mocked(writeNsaOrNoEmailBookingsToCsv);
const mockedWriteCandidateBookingsToCsv = mocked(writeCandidateBookingsToCsv);

jest.mock('../../../../src/utils/time');
const mockedExecutionTimeoutNearlyReached = mocked(executionTimeoutNearlyReached);

describe('Candidate Processor', () => {
  let candidateProcessor: CandidateProcessor;
  let jobDescriptor: JobDescriptor;
  let bookings: CandidateBooking[];
  const mockJobName = 'mockJobName';
  const mockNow = '2021-06-21T16:15:00.000Z';
  const mockExecutionStartDateTime = new Date('2021-06-21T16:14:00.000Z');
  const mockTargetDirectory = 'job-runs/mockJobName/20210621_161500';

  beforeEach(() => {
    candidateProcessor = new CandidateProcessor(mockedAzureBlobClient, mockedCrmClient, mockedNotificationsClient, mockedSchedulingClient);
    MockDate.set(mockNow);
    jobDescriptor = buildMockJobDescriptor();
    bookings = buildMockCandidateBookings(1);
    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(bookings);
    mockedExecutionTimeoutNearlyReached.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Retrieve candidate bookings from CRM', () => {
    test('fetches candidate bookings matching the given criteria with testCentreIds', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedCrmClient.getBookingsByOrigin).toHaveBeenCalledWith(
        OriginType.CANDIDATE, jobDescriptor.dateFrom, jobDescriptor.dateTo, mockTestCentreIds,
      );
    });

    test('fetches candidate bookings matching the given criteria all test centres', async () => {
      (jobDescriptor as JsonObject).testCentreIds = undefined;
      jobDescriptor.allTestCentres = true;

      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedCrmClient.getBookingsByOrigin).toHaveBeenCalledWith(
        OriginType.CANDIDATE, jobDescriptor.dateFrom, jobDescriptor.dateTo, undefined,
      );
    });
  });

  describe('Save NSA and bookings without emails to a CSV', () => {
    test('successfully save NSA and no email bookings to a CSV', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedWriteNsaOrNoEmailBookingsToCsv).toHaveBeenCalledWith(bookings, mockTargetDirectory, mockedAzureBlobClient);
    });

    test('failing to save NSA or no email bookings to a CSV - throw the error', async () => {
      const error = new Error('error');
      mockedWriteNsaOrNoEmailBookingsToCsv.mockRejectedValue(error);

      await expect(candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime))
        .rejects.toStrictEqual(error);

      expect(writeNsaOrNoEmailBookingsToCsv).toHaveBeenCalledWith(bookings, mockTargetDirectory, mockedAzureBlobClient);
    });
  });

  describe('Sends cancellation email/letter - Notifications API', () => {
    test('successfully sends notification', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedSendCandidateBookingCancellationNotification).toHaveBeenCalledWith(jobDescriptor, mockedNotificationsClient, bookings[0]);
    });

    test('if notification sending fails - log and swallow the error', async () => {
      const error = new Error('notification sending error');
      mockedSendCandidateBookingCancellationNotification.mockRejectedValue(error);

      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'CandidateProcessor::processJob: Failed to send cancellation notification - notification sending error',
        {
          bookingId: bookings[0].bookingId,
          bookingRef: bookings[0].bookingReference,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductRef: bookings[0].bookingProductReference,
          origin: OriginType.CANDIDATE,
        },
      );
      expect(mockedSchedulingClient.deleteBooking).toHaveBeenCalledWith(bookings[0]); // Still deletes slot
      expect(mockedCrmClient.markBookingAsCompensated).toHaveBeenCalledWith(bookings[0], jobDescriptor.cancelReasonCode, true); // Still updates CRM
    });
  });

  describe('Deletes booking in TCN - Scheduling API', () => {
    test('successfully deletes TCN booking', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedSchedulingClient.deleteBooking).toHaveBeenCalledWith(bookings[0]);
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_TCN_CANCELLATION_SUCCEEDED,
        'CandidateProcessor::processJob: Successfully cancelled booking with TCN',
        {
          bookingId: bookings[0].bookingId,
          bookingRef: bookings[0].bookingReference,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductRef: bookings[0].bookingProductReference,
          origin: OriginType.CANDIDATE,
        },
      );
    });

    test('TCN booking is not deleted if test date is in the past', async () => {
      MockDate.set('2021-08-03T12:30:00.000Z');
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedSchedulingClient.deleteBooking).not.toHaveBeenCalled();
      expect(mockedCrmClient.markBookingAsCompensated).toHaveBeenCalledWith(bookings[0], jobDescriptor.cancelReasonCode, false);
    });

    test('if deleting TCN booking fails - log the event and swallow the error', async () => {
      const error = new Error('scheduling api error');
      mockedSchedulingClient.deleteBooking.mockRejectedValue(error);

      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedSchedulingClient.deleteBooking).toHaveBeenCalledWith(bookings[0]);
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_TCN_CANCELLATION_FAILED,
        'CandidateProcessor::processJob: Failed to cancel booking with TCN',
        {
          bookingId: bookings[0].bookingId,
          bookingRef: bookings[0].bookingReference,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductRef: bookings[0].bookingProductReference,
          origin: OriginType.CANDIDATE,
          error,
        },
      );
    });
  });

  describe('Set Booking as assigned compensation in CRM', () => {
    test('successfully marks booking as compensated', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedCrmClient.markBookingAsCompensated).toHaveBeenCalledWith(bookings[0], jobDescriptor.cancelReasonCode, true);
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_CRM_CANCELLATION_SUCCEEDED,
        'CandidateProcessor::processJob: Successfully cancelled booking with CRM',
        {
          bookingId: bookings[0].bookingId,
          bookingRef: bookings[0].bookingReference,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductRef: bookings[0].bookingProductReference,
          origin: OriginType.CANDIDATE,
        },
      );
    });

    test('if fails to mark booking as compensated - log the event and swallow the error', async () => {
      const error = new Error('crm error');
      mockedCrmClient.markBookingAsCompensated.mockRejectedValue(error);

      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedCrmClient.markBookingAsCompensated).toHaveBeenCalledWith(bookings[0], jobDescriptor.cancelReasonCode, true);
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_CRM_CANCELLATION_FAILED,
        'CandidateProcessor::processJob: Failed to update CRM',
        {
          bookingId: bookings[0].bookingId,
          bookingRef: bookings[0].bookingReference,
          bookingProductId: bookings[0].bookingProductId,
          bookingProductRef: bookings[0].bookingProductReference,
          origin: OriginType.CANDIDATE,
          error,
        },
      );
    });
  });

  describe('Function timeout check', () => {
    test('returns job result with jobFinished=false if not enough time to complete processing before timeout', async () => {
      mockedConfig.functionTimeout = 600;
      mockedConfig.functionTimeoutBuffer = 30;
      mockedExecutionTimeoutNearlyReached.mockReturnValue(true);

      const result = await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(result).toStrictEqual<JobResult>({
        jobFinished: false,
        reason: 'Candidate job - function timeout nearly reached',
      });
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_FUNCTION_TIMEOUT_NEARLY_REACHED,
        'CandidateProcessor::processJob: Function timeout nearly reached',
        {
          jobName: mockJobName,
          executionStartDateTime: mockExecutionStartDateTime,
          functionTimeoutSeconds: mockedConfig.functionTimeout,
          functionTimeoutBufferSeconds: mockedConfig.functionTimeoutBuffer,
        },
      );
    });
  });

  describe('Dry run', () => {
    beforeEach(() => {
      jobDescriptor.dryRun = true;
    });

    test('Save all candidate bookings to a CSV and stops', async () => {
      await candidateProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedWriteCandidateBookingsToCsv).toHaveBeenCalledWith(bookings, mockTargetDirectory, mockedAzureBlobClient);
      expect(mockedWriteNsaOrNoEmailBookingsToCsv).not.toHaveBeenCalled();
      expect(mockedSchedulingClient.deleteBooking).not.toHaveBeenCalled();
      expect(mockedCrmClient.markBookingAsCompensated).not.toHaveBeenCalled();
    });
  });
});
