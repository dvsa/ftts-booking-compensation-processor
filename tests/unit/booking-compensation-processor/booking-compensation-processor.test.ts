import MockDate from 'mockdate';
import { mocked } from 'ts-jest/utils';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';

import { BookingCompensationProcessor } from '../../../src/booking-compensation-processor/booking-compensation-processor';
import { AzureBlobClient } from '../../../src/services/azure-blob-client';
import { CrmClient } from '../../../src/services/crm/crm-client';
import { validateJobDescriptor } from '../../../src/utils/validation/validate-job-descriptor';
import { JobDescriptorValidationError } from '../../../src/errors/job-descriptor-validation-error';
import { buildMockJobDescriptor } from '../../stubs/job-descriptor.mock';
import { Job, JobDescriptor } from '../../../src/types';
import { CandidateProcessor } from '../../../src/booking-compensation-processor/candidate/candidate-processor';
import { TrainerBookerProcessor } from '../../../src/booking-compensation-processor/trainer-booker/trainer-booker-processor';
import { OriginType } from '../../../src/services/crm/types/enums';
import { buildMockTrainerBookerBookings } from '../../stubs/trainer-booker-booking.mock';
import { BusinessTelemetryEvents, logger } from '../../../src/libraries/logger';

jest.mock('../../../src/services/azure-blob-client');
const mockedAzureBlobClient = mocked(new AzureBlobClient());

jest.mock('../../../src/services/crm/crm-client');
const mockedCrmClient = mock<CrmClient>();

jest.mock('../../../src/utils/validation/validate-job-descriptor');
const mockedValidateJobDescriptor = mocked(validateJobDescriptor);

jest.mock('../../../src/booking-compensation-processor/candidate/candidate-processor');
const mockedCandidateProcessor = mocked(new CandidateProcessor());

jest.mock('../../../src/booking-compensation-processor/trainer-booker/trainer-booker-processor');
const mockedTrainerBookerProcessor = mocked(new TrainerBookerProcessor());

describe('BookingCompensationProcessor', () => {
  const mockNow = '2021-06-21T16:15:00.000Z';
  const mockExecutionStartDateTime = new Date('2021-06-21T16:14:00.000Z');
  let mockTestCentreIds: string[];
  const mockTargetDirectory = 'job-runs/mockJobName/20210621_161500';
  const mockTargetDirectoryDryRun = 'job-runs/mockJobName/dry-run/20210621_161500';
  let jobDescriptor: JobDescriptor;
  let bookingCompensationProcessor: BookingCompensationProcessor;

  beforeEach(() => {
    jobDescriptor = buildMockJobDescriptor();
    mockTestCentreIds = ['test-centre-001', 'test-centre-002', 'test-centre-003'];
    mockedCandidateProcessor.processJob.mockResolvedValue({ jobFinished: true });
    mockedTrainerBookerProcessor.processJob.mockResolvedValue({ jobFinished: true });
    bookingCompensationProcessor = new BookingCompensationProcessor(
      mockedAzureBlobClient,
      mockedCandidateProcessor,
      mockedTrainerBookerProcessor,
    );
    MockDate.set(mockNow);
  });

  afterEach(() => {
    MockDate.reset();
    jest.resetAllMocks();
  });

  describe('scanForJobs', () => {
    test('returns undefined if no jobs are found', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue([]);

      const result = await bookingCompensationProcessor.scanForJobs();

      expect(result).toBeUndefined();
    });

    test('returns next job if valid job is found', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['mockJobA', 'mockJobB']);
      mockedAzureBlobClient.downloadFile.mockResolvedValue(Buffer.from(JSON.stringify(jobDescriptor)));
      mockedValidateJobDescriptor.mockImplementation(() => ({ isValid: true }));

      const result = await bookingCompensationProcessor.scanForJobs();

      expect(result).toStrictEqual<Job>({
        name: 'mockJobA',
        descriptor: jobDescriptor,
      });
    });

    test('throws error if invalid job is found', async () => {
      mockedAzureBlobClient.listFiles.mockResolvedValue(['mockJobB']);
      mockedAzureBlobClient.downloadFile.mockResolvedValue(Buffer.from('{}'));
      mockedValidateJobDescriptor.mockImplementation(() => ({
        isValid: false,
        errorMessage: 'validation message',
      }));

      await expect(bookingCompensationProcessor.scanForJobs()).rejects.toStrictEqual(
        new JobDescriptorValidationError('BookingCompensationProcessor::assertIsValidJobDescriptor: Invalid job descriptor mockJobB - validation message'),
      );
    });
  });

  describe('processJob', () => {
    beforeEach(() => {
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue([]);
    });

    test('copies the job descriptor file to the target directory', async () => {
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        `${mockTargetDirectory}/mockJobName.json`,
        JSON.stringify(jobDescriptor),
      );
    });

    test('for dry run copies the job descriptor file to the target directory', async () => {
      jobDescriptor.dryRun = true;

      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        `${mockTargetDirectoryDryRun}/mockJobName.json`,
        JSON.stringify(jobDescriptor),
      );
    });

    test('doesn\'t fetch and process candidate bookings if the ignore flag is true', async () => {
      jobDescriptor.ignoreCandidateBookings = true;
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedCandidateProcessor.processJob).not.toHaveBeenCalled();
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_SKIPPED_CANDIDATE_BOOKINGS,
        'BookingCompensationProcessor::processJob: Candidate bookings have been skipped, will not process',
        {
          jobName: 'mockJobName',
          jobDescriptor,
        },
      );
    });

    test('fetches and processes candidate bookings if the ignore flag is false', async () => {
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedCandidateProcessor.processJob).toHaveBeenCalledWith(
        'mockJobName', jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime,
      );
    });

    test('fetches and processes candidate bookings if the ignore flag is undefined', async () => {
      delete jobDescriptor.ignoreCandidateBookings;
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedCandidateProcessor.processJob).toHaveBeenCalledWith(
        'mockJobName', jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime,
      );
    });

    test('doesn\'t fetch and process trainer booker bookings if the ignore flag is true', async () => {
      jobDescriptor.ignoreTrainerBookerBookings = true;
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedTrainerBookerProcessor.processJob).not.toHaveBeenCalled();
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_SKIPPED_TRAINER_BOOKER_BOOKINGS,
        'BookingCompensationProcessor::processJob: Trainer booker bookings have been skipped, will not process',
        {
          jobName: 'mockJobName',
          jobDescriptor,
        },
      );
    });

    test('fetches and processes trainer booker bookings if the ignore flag is false', async () => {
      const mockTrainerBookings = buildMockTrainerBookerBookings(3);
      when(mockedCrmClient.getBookingsByOrigin)
        .calledWith(OriginType.TRAINER_BOOKER, jobDescriptor.dateFrom, jobDescriptor.dateTo, mockTestCentreIds)
        .mockResolvedValue(mockTrainerBookings);

      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedTrainerBookerProcessor.processJob).toHaveBeenCalledWith('mockJobName', jobDescriptor, mockTargetDirectory, mockExecutionStartDateTime);
    });

    test('fetches and processes trainer booker bookings if the ignore flag is undefined', async () => {
      jobDescriptor.dryRun = true;
      const mockTrainerBookings = buildMockTrainerBookerBookings(3);
      when(mockedCrmClient.getBookingsByOrigin)
        .calledWith(OriginType.TRAINER_BOOKER, jobDescriptor.dateFrom, jobDescriptor.dateTo, mockTestCentreIds)
        .mockResolvedValue(mockTrainerBookings);
      delete jobDescriptor.ignoreTrainerBookerBookings;

      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedTrainerBookerProcessor.processJob).toHaveBeenCalledWith('mockJobName', jobDescriptor, mockTargetDirectoryDryRun, mockExecutionStartDateTime);
    });

    test('once finished processing, marks the job completed by deleting the original job descriptor file', async () => {
      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedAzureBlobClient.deleteFile).toHaveBeenCalledWith('jobs/mockJobName.json');
    });

    test('if the job doesn\'t finish processing, doesn\'t delete the original job descriptor file', async () => {
      mockedTrainerBookerProcessor.processJob.mockResolvedValue({ jobFinished: false });

      await bookingCompensationProcessor.processJob('mockJobName', jobDescriptor, mockExecutionStartDateTime);

      expect(mockedAzureBlobClient.deleteFile).not.toHaveBeenCalled();
    });
  });
});
