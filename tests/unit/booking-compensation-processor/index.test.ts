import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { mocked } from 'ts-jest/utils';
import { bookingCompensationProcessorTimerTrigger, index } from '../../../src/booking-compensation-processor';
import { logger } from '../../../src/libraries/logger';
import { mockedContext } from '../../stubs/context.mock';
import { BookingCompensationProcessor } from '../../../src/booking-compensation-processor/booking-compensation-processor';
import { JobDescriptor } from '../../../src/types';

jest.mock('../../../src/libraries/logger');
jest.mock('../../../src/services/azure-blob-client');
jest.mock('@dvsa/ftts-auth-client');

const mockedNonHttpTrigger = mocked(nonHttpTriggerContextWrapper);

describe('bookingCompensationProcessor', () => {
  describe('index', () => {
    test('runs wrapper', async () => {
      await index(mockedContext);

      expect(mockedNonHttpTrigger).toHaveBeenCalledWith(expect.any(Function), mockedContext);
    });
  });

  describe('timer trigger', () => {
    let mockTestCentreIds: string[];
    let mockJobDescriptor: JobDescriptor;

    beforeEach(() => {
      mockTestCentreIds = ['test-centre-001', 'test-centre-002', 'test-centre-003'];
      mockJobDescriptor = {
        dateFrom: '2021-07-01T14:00:00Z',
        dateTo: '2021-07-10T20:00:00Z',
        testCentreIds: mockTestCentreIds,
        allTestCentres: false,
        businessCancelReason: 'global pandemic happened',
        dryRun: false,
      };
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('executes with jobs', async () => {
      jest.spyOn(BookingCompensationProcessor.prototype, 'processJob').mockImplementation(() => Promise.resolve());
      jest.spyOn(BookingCompensationProcessor.prototype, 'scanForJobs').mockImplementation(() => Promise.resolve({ name: 'mockJob', descriptor: mockJobDescriptor }));
      await bookingCompensationProcessorTimerTrigger(mockedContext);

      expect(BookingCompensationProcessor.prototype.scanForJobs).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'bookingCompensationProcessorTimerTrigger: Starting processing job mockJob',
      );
    });

    test('executes without jobs', async () => {
      jest.spyOn(BookingCompensationProcessor.prototype, 'scanForJobs').mockImplementation(() => Promise.resolve(undefined));
      await bookingCompensationProcessorTimerTrigger(mockedContext);

      expect(BookingCompensationProcessor.prototype.scanForJobs).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'bookingCompensationProcessorTimerTrigger: No jobs found',
      );
      expect(logger.info).not.toHaveBeenCalledWith(
        'bookingCompensationProcessorTimerTrigger: Starting processing job mockJob',
      );
    });
  });
});
