import MockDate from 'mockdate';
import { mocked } from 'ts-jest/utils';
import { sendTrainerBookerBookingCancellationEmail } from '../../../../src/booking-compensation-processor/trainer-booker/send-trainer-booker-booking-cancellation-email';
import { TrainerBookerProcessor } from '../../../../src/booking-compensation-processor/trainer-booker/trainer-booker-processor';
import { writeTrainerBookingsToCsv } from '../../../../src/booking-compensation-processor/trainer-booker/write-trainer-bookings-to-csv';
import { config } from '../../../../src/config';
import { CrmError } from '../../../../src/errors/crm-error';
import { BusinessTelemetryEvents, logger } from '../../../../src/libraries/logger';
import { AzureBlobClient } from '../../../../src/services/azure-blob-client';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { TrainerBookerBooking } from '../../../../src/services/crm/types/bookings';
import { OriginType, TriggerAction } from '../../../../src/services/crm/types/enums';
import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { JobDescriptor, JobResult, JsonObject } from '../../../../src/types';
import { executionTimeoutNearlyReached } from '../../../../src/utils/time';
import { buildMockJobDescriptor } from '../../../stubs/job-descriptor.mock';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';

jest.mock('../../../../src/services/azure-blob-client');
const mockedAzureBlobClient = mocked(new AzureBlobClient());

jest.mock('../../../../src/services/crm/crm-client');
const mockedCrmClient = mocked(new CrmClient());

jest.mock('../../../../src/services/notification/notification-client');
const mockedNotificationsClient = mocked(new NotificationsClient());

jest.mock('../../../../src/libraries/logger');
const mockedLogger = mocked(logger, true);

jest.mock('../../../../src/config');
const mockedConfig = mocked(config, true);

jest.mock('../../../../src/utils/time');
const mockedExecutionTimeoutNearlyReached = mocked(executionTimeoutNearlyReached);

jest.mock('../../../../src/booking-compensation-processor/trainer-booker/write-trainer-bookings-to-csv');
const mockedWriteTrainerBookingsToCsv = mocked(writeTrainerBookingsToCsv);

jest.mock('../../../../src/booking-compensation-processor/trainer-booker/send-trainer-booker-booking-cancellation-email');

describe('Trainer Booker Processor', () => {
  let trainerBookerProcessor: TrainerBookerProcessor;
  const mockJobName = 'mockJobName';
  const mockNow = '2021-06-21T16:15:00.000Z';
  const mockExecutionStartDateTime = new Date('2021-06-21T16:14:00.000Z');
  let jobDescriptor: JobDescriptor;
  let mockBookings: TrainerBookerBooking[];
  const mockTargetDirectory = 'job-runs/mockJobName/20210621_161500';

  beforeEach(() => {
    mockBookings = buildMockTrainerBookerBookings(5);
    mockBookings[0].organisationId = '8c70c285-4b7f-42d3-aacb-7d5ea9a81a07';
    mockBookings[0].organisationEmail = undefined;
    mockBookings[1].organisationId = '8c70c285-4b7f-42d3-aacb-7d5ea9a81a07';
    mockBookings[1].organisationEmail = 'org1@email.com';
    mockBookings[2].organisationId = '8c70c285-4b7f-42d3-aacb-7d5ea9a81a07';
    mockBookings[2].organisationEmail = undefined;
    mockBookings[3].organisationId = '1fdc4219-7148-47ae-a467-52f8a9d41e3a';
    mockBookings[4].organisationId = '1fdc4219-7148-47ae-a467-52f8a9d41e3a';
    mockBookings[4].organisationEmail = 'org2@email.com';
    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
    trainerBookerProcessor = new TrainerBookerProcessor(mockedCrmClient, mockedNotificationsClient, mockedAzureBlobClient);
    MockDate.set(mockNow);
    jobDescriptor = buildMockJobDescriptor();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('fetches trainer booker bookings given specific testCentreIds', async () => {
    await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

    expect(mockedCrmClient.getBookingsByOrigin).toHaveBeenCalledWith(
      OriginType.TRAINER_BOOKER,
      jobDescriptor.dateFrom,
      jobDescriptor.dateTo,
      (jobDescriptor as JsonObject).testCentreIds,
    );
    expect(sendTrainerBookerBookingCancellationEmail).toHaveBeenCalledWith(
      mockBookings[0].organisationId,
      expect.objectContaining({}),
      expect.objectContaining({}),
      expect.objectContaining({}),
    );
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenCalledTimes(2);
  });

  test('fetches all trainer booker bookings given allTestCentres set to true', async () => {
    (jobDescriptor as JsonObject).testCentreIds = undefined;
    jobDescriptor.allTestCentres = true;

    await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

    expect(mockedCrmClient.getBookingsByOrigin).toHaveBeenCalledWith(
      OriginType.TRAINER_BOOKER,
      jobDescriptor.dateFrom,
      jobDescriptor.dateTo,
      undefined,
    );
    expect(sendTrainerBookerBookingCancellationEmail).toHaveBeenCalledWith(
      mockBookings[0].organisationId,
      expect.objectContaining([
        mockBookings[0],
        mockBookings[1],
        mockBookings[2],
      ]),
      jobDescriptor,
      mockedNotificationsClient,
    );
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenCalledTimes(2);
  });

  test('rethrows any errors coming from the CRM call', async () => {
    const error = new CrmError('msg');
    mockedCrmClient.getBookingsByOrigin.mockRejectedValue(error);

    await expect(trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime))
      .rejects.toEqual(error);
  });

  test('logs warning and skips CRM call if no booked slots for the given bookings', async () => {
    (mockBookings[3].bookedSlotId as any) = undefined;
    (mockBookings[4].bookedSlotId as any) = undefined;

    await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No booked slots for the given bookings'),
      expect.objectContaining({
        organisationId: mockBookings[3].organisationId,
        bookingIds: [mockBookings[3].bookingId, mockBookings[4].bookingId],
      }),
    );
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenCalledTimes(1);
  });

  test('booking slots are unique', async () => {
    mockBookings[0].bookedSlotId = 'booking-slot-1';
    mockBookings[1].bookedSlotId = 'booking-slot-2';
    mockBookings[2].bookedSlotId = 'booking-slot-2';
    mockBookings[3].bookedSlotId = 'booking-slot-3';
    mockBookings[4].bookedSlotId = 'booking-slot-3';
    await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

    expect(mockedCrmClient.getBookingsByOrigin).toHaveBeenCalledWith(
      OriginType.TRAINER_BOOKER,
      jobDescriptor.dateFrom,
      jobDescriptor.dateTo,
      (jobDescriptor as JsonObject).testCentreIds,
    );
    expect(sendTrainerBookerBookingCancellationEmail).toHaveBeenCalledWith(
      mockBookings[0].organisationId,
      expect.objectContaining({}),
      expect.objectContaining({}),
      expect.objectContaining({}),
    );
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenCalledTimes(2);
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenNthCalledWith(1,
      ['booking-slot-1', 'booking-slot-2'],
      TriggerAction.CANCEL_WITH_OWED_COMPENSATION_CHANGE,
      jobDescriptor.cancelReasonCode);
    expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).toHaveBeenNthCalledWith(2,
      ['booking-slot-3'],
      TriggerAction.CANCEL_WITH_OWED_COMPENSATION_CHANGE,
      jobDescriptor.cancelReasonCode);
  });

  describe('Function timeout check', () => {
    test('throws TimeoutError to abort run if not enough time to complete processing before function timeout', async () => {
      mockedConfig.functionTimeout = 600;
      mockedConfig.functionTimeoutBuffer = 30;
      mockedExecutionTimeoutNearlyReached.mockReturnValue(true);

      const result = await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(result).toStrictEqual<JobResult>({
        jobFinished: false,
        reason: 'Trainer booker job - function timeout nearly reached',
      });
      expect(mockedLogger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_FUNCTION_TIMEOUT_NEARLY_REACHED,
        'TrainerBookerProcessor::processJob: Function timeout nearly reached',
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

    test('Save all trainer bookings to a CSV and stops', async () => {
      await trainerBookerProcessor.processJob(mockJobName, jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);

      expect(mockedWriteTrainerBookingsToCsv).toHaveBeenCalledWith(mockBookings, mockTargetDirectory, mockedAzureBlobClient);
      expect(sendTrainerBookerBookingCancellationEmail).not.toHaveBeenCalled();
      expect(mockedCrmClient.batchUpdateBookedSlotTriggerAction).not.toHaveBeenCalled();
      expect(mockedCrmClient.markBookingAsCompensated).not.toHaveBeenCalled();
    });
  });
});
