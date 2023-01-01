import axiosRetryClient from '../../../../src/libraries/axios-retry-client';
import { logger } from '../../../../src/libraries/logger';
import { ManagedIdentityAuth } from '../../../../src/services/auth/managed-identity-auth';
import { CandidateBooking } from '../../../../src/services/crm/types/bookings';
import { OriginType } from '../../../../src/services/crm/types/enums';
import { TcnRegion } from '../../../../src/services/scheduling/enums';
import { SchedulingClient } from '../../../../src/services/scheduling/scheduling-client';
import { buildMockCandidateBooking } from '../../../stubs/candidate-booking.mock';

jest.mock('../../../../src/libraries/axios-retry-client');
const mockedAxios = axiosRetryClient as jest.Mocked<typeof axiosRetryClient>;

describe('SchedulingClient', () => {
  let schedulingClient: SchedulingClient;
  let mockCandidateBooking: CandidateBooking;

  const mockAuthHeaders = {
    headers: {
      Authorization: 'Bearer mock-access-token',
    },
  };

  const mockAuthClient: ManagedIdentityAuth = {
    getAuthHeader: () => (mockAuthHeaders),
  } as unknown as ManagedIdentityAuth;

  beforeEach(() => {
    schedulingClient = new SchedulingClient(mockAuthClient);
    mockCandidateBooking = buildMockCandidateBooking();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('deleteBooking', () => {
    test('should send a request to delete a booking with correct auth headers to region A', async () => {
      mockCandidateBooking.isTcnRegionA = true;
      mockCandidateBooking.isTcnRegionB = false;
      mockCandidateBooking.isTcnRegionC = false;

      await schedulingClient.deleteBooking(mockCandidateBooking);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/v1/tcn/${TcnRegion.A}/bookings/${mockCandidateBooking.bookingProductReference}`,
        mockAuthHeaders,
      );

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Attempting to delete booking in TCN',
        {
          requestUrl: `/v1/tcn/${TcnRegion.A}/bookings/${mockCandidateBooking.bookingProductReference}`,
          bookingProductReference: mockCandidateBooking.bookingProductReference,
          testCentreRegion: TcnRegion.A,
        },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Successfully deleted booking in TCN',
        {
          bookingProductReference: mockCandidateBooking.bookingProductReference,
        },
      );
    });

    test('should send a request to delete a booking with correct auth headers to region B', async () => {
      mockCandidateBooking.isTcnRegionA = false;
      mockCandidateBooking.isTcnRegionB = true;
      mockCandidateBooking.isTcnRegionC = false;

      await schedulingClient.deleteBooking(mockCandidateBooking);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/v1/tcn/${TcnRegion.B}/bookings/${mockCandidateBooking.bookingProductReference}`,
        mockAuthHeaders,
      );

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Attempting to delete booking in TCN',
        {
          requestUrl: `/v1/tcn/${TcnRegion.B}/bookings/${mockCandidateBooking.bookingProductReference}`,
          bookingProductReference: mockCandidateBooking.bookingProductReference,
          testCentreRegion: TcnRegion.B,
        },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Successfully deleted booking in TCN',
        {
          bookingProductReference: mockCandidateBooking.bookingProductReference,
        },
      );
    });

    test('should send a request to delete a booking with correct auth headers to region C', async () => {
      mockCandidateBooking.isTcnRegionA = false;
      mockCandidateBooking.isTcnRegionB = false;
      mockCandidateBooking.isTcnRegionC = true;

      await schedulingClient.deleteBooking(mockCandidateBooking);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/v1/tcn/${TcnRegion.C}/bookings/${mockCandidateBooking.bookingProductReference}`,
        mockAuthHeaders,
      );

      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Attempting to delete booking in TCN',
        {
          requestUrl: `/v1/tcn/${TcnRegion.C}/bookings/${mockCandidateBooking.bookingProductReference}`,
          bookingProductReference: mockCandidateBooking.bookingProductReference,
          testCentreRegion: TcnRegion.C,
        },
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'SchedulingClient::deleteBooking: Successfully deleted booking in TCN',
        {
          bookingProductReference: mockCandidateBooking.bookingProductReference,
        },
      );
    });

    test('should log and rethrow if an error occurs', async () => {
      const errorMessage = 'Error';
      const error = new Error(errorMessage);
      mockedAxios.delete.mockRejectedValue(error);

      await expect(schedulingClient.deleteBooking(mockCandidateBooking)).rejects.toBe(error);

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/v1/tcn/${TcnRegion.B}/bookings/${mockCandidateBooking.bookingProductReference}`,
        mockAuthHeaders,
      );

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'SchedulingClient::deleteBooking: Deleting booking in TCN failed',
        {
          bookingId: mockCandidateBooking.bookingId,
          bookingProductId: mockCandidateBooking.bookingProductId,
          bookingProductRef: mockCandidateBooking.bookingProductReference,
          bookingRef: mockCandidateBooking.bookingReference,
          origin: OriginType.CANDIDATE,
        },
      );
    });

    test('should log and rethrow if no test centre region has been set', async () => {
      mockCandidateBooking.isTcnRegionA = false;
      mockCandidateBooking.isTcnRegionB = false;
      mockCandidateBooking.isTcnRegionC = false;

      const error = new Error('SchedulingClient::calaculateTestCentreRegion: No TCN Region set on test centre');

      await expect(schedulingClient.deleteBooking(mockCandidateBooking)).rejects.toThrow();

      expect(mockedAxios.delete).not.toHaveBeenCalled();

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'SchedulingClient::deleteBooking: Deleting booking in TCN failed',
        {
          bookingId: mockCandidateBooking.bookingId,
          bookingProductId: mockCandidateBooking.bookingProductId,
          bookingProductRef: mockCandidateBooking.bookingProductReference,
          bookingRef: mockCandidateBooking.bookingReference,
          origin: OriginType.CANDIDATE,
        },
      );
    });
  });
});
