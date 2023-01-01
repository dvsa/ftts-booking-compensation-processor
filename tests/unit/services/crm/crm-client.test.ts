import DynamicsWebApi from 'dynamics-web-api';
import MockDate from 'mockdate';
import { mock } from 'jest-mock-extended';
import { mocked } from 'ts-jest/utils';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { XmlQueryBuilder } from '../../../../src/services/crm/queries/xml-query-builder';
import { CandidateBooking, TrainerBookerBooking } from '../../../../src/services/crm/types/bookings';
import { buildMockCandidateBooking, buildMockCandidateBookings } from '../../../stubs/candidate-booking.mock';
import { CrmError } from '../../../../src/errors/crm-error';
import mockedConfig from '../../../stubs/config.mock';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';
import {
  BookingStatus,
  CancelReason,
  FinanceTransactionStatus,
  Origin,
  OriginType,
  TriggerAction,
} from '../../../../src/services/crm/types/enums';
import { BusinessTelemetryEvents, logger } from '../../../../src/libraries/logger';

jest.mock('../../../../src/services/crm/queries/xml-query-builder');
const mockedXmlQueryBuilder = mocked(new XmlQueryBuilder());
const mockedDynamicsWebApi = mock<DynamicsWebApi>();

let crmClient: CrmClient;
let mockCandidateBooking: CandidateBooking;

describe('CrmClient', () => {
  const mockDateFrom = '2021-08-02T00:00:00Z';
  const mockDateTo = '2021-08-05T00:00:00Z';
  const mockNow = '2021-01-01T14:00:00.000Z';
  const mockTestCentreIds = ['test-centre-001', 'test-centre-002'];

  beforeEach(() => {
    mockedConfig.crm.fetchRecordsPerPage = '100';
    crmClient = new CrmClient(
      mockedDynamicsWebApi,
      mockedXmlQueryBuilder,
    );
    mockCandidateBooking = buildMockCandidateBooking();
    MockDate.set(mockNow);
  });

  afterEach(() => {
    jest.resetAllMocks();
    MockDate.reset();
  });

  describe('getBookingsByOrigin', () => {
    const mockCandidateBookingsXmlQuery = 'mockCandidateBookingsXmlQuery';
    const mockTrainerBookerBookingsXmlQuery = 'mockTrainerBookerBookingsXmlQuery';
    let mockCandidateBookings: CandidateBooking[];
    let mockTrainerBookerBookings: TrainerBookerBooking[];
    beforeEach(() => {
      mockCandidateBookings = buildMockCandidateBookings(2);
      mockTrainerBookerBookings = buildMockTrainerBookerBookings(2);
      mockedXmlQueryBuilder.buildGetCandidateBookingsQuery.mockResolvedValue(mockCandidateBookingsXmlQuery);
      mockedXmlQueryBuilder.buildGetTrainerBookerBookingsQuery.mockResolvedValue(mockTrainerBookerBookingsXmlQuery);
    });

    test('returns array of candidate bookings for the given date range and test centres', async () => {
      mockedDynamicsWebApi.fetch.mockResolvedValue({ value: mockCandidateBookings });

      const bookings = await crmClient.getBookingsByOrigin(OriginType.CANDIDATE, mockDateFrom, mockDateTo, mockTestCentreIds);

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_bookingproducts', mockCandidateBookingsXmlQuery, undefined, 1,
      );
      expect(bookings).toHaveLength(2);
      expect(bookings).toStrictEqual(mockCandidateBookings);
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_SUCCEEDED,
        'CrmClient::getBookingsByOrigin: Successfully fetched 2 records',
        expect.objectContaining({
          type: OriginType.CANDIDATE,
        }),
      );
    });

    test('returns array of trainer booker bookings for the given date range and test centres', async () => {
      mockedDynamicsWebApi.fetch.mockResolvedValue({ value: mockTrainerBookerBookings });

      const bookings = await crmClient.getBookingsByOrigin(OriginType.TRAINER_BOOKER, mockDateFrom, mockDateTo, mockTestCentreIds);

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledWith(
        'ftts_bookingproducts', mockTrainerBookerBookingsXmlQuery, undefined, 1,
      );
      expect(bookings).toHaveLength(2);
      expect(bookings).toStrictEqual(mockTrainerBookerBookings);
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_SUCCEEDED,
        'CrmClient::getBookingsByOrigin: Successfully fetched 2 records',
        expect.objectContaining({
          type: OriginType.TRAINER_BOOKER,
        }),
      );
    });

    test('filters out records with missing required fields', async () => {
      // eslint-disable-next-line
      /* @ts-ignore */
      delete mockCandidateBookings[0].bookingProductReference;
      mockedDynamicsWebApi.fetch.mockResolvedValue({ value: mockCandidateBookings });

      const bookings = await crmClient.getBookingsByOrigin(OriginType.CANDIDATE, mockDateFrom, mockDateTo, mockTestCentreIds);

      expect(bookings).toHaveLength(1);
      expect(bookings).toStrictEqual([mockCandidateBookings[1]]);
    });

    test('fetches records page by page when number of records exceeds max records per page', async () => {
      mockedConfig.crm.fetchRecordsPerPage = '1';
      mockedDynamicsWebApi.fetch.mockResolvedValueOnce({
        value: [mockCandidateBookings[0]],
        PagingInfo: {
          nextPage: 2,
        },
      });
      mockedDynamicsWebApi.fetch.mockResolvedValueOnce({
        value: [mockCandidateBookings[1]],
      });

      const bookings = await crmClient.getBookingsByOrigin(OriginType.CANDIDATE, mockDateFrom, mockDateTo, mockTestCentreIds);

      expect(mockedDynamicsWebApi.fetch).toHaveBeenCalledTimes(2);
      expect(mockedDynamicsWebApi.fetch).toHaveBeenNthCalledWith(
        1, 'ftts_bookingproducts', mockCandidateBookingsXmlQuery, undefined, 1,
      );
      expect(mockedDynamicsWebApi.fetch).toHaveBeenNthCalledWith(
        2, 'ftts_bookingproducts', mockCandidateBookingsXmlQuery, undefined, 2,
      );
      expect(bookings).toHaveLength(2);
      expect(bookings).toStrictEqual(mockCandidateBookings);
    });

    test('throws CrmError if the call fails - candidate', async () => {
      mockedDynamicsWebApi.fetch.mockRejectedValue({ message: 'CRM went wrong' });

      await expect(crmClient.getBookingsByOrigin(OriginType.CANDIDATE, mockDateFrom, mockDateTo, mockTestCentreIds)).rejects.toStrictEqual(
        new CrmError('Failed to fetch Candidate booking records - CRM went wrong'),
      );
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_FAILED,
        'CrmClient::getBookingsByOrigin: Failed to fetch any records',
        expect.objectContaining({
          type: OriginType.CANDIDATE,
        }),
      );
    });

    test('throws CrmError if the call fails - trainer booker', async () => {
      mockedDynamicsWebApi.fetch.mockRejectedValue({ message: 'CRM went wrong' });

      await expect(crmClient.getBookingsByOrigin(OriginType.TRAINER_BOOKER, mockDateFrom, mockDateTo, mockTestCentreIds)).rejects.toStrictEqual(
        new CrmError('Failed to fetch Trainer Booker booking records - CRM went wrong'),
      );
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_FAILED,
        'CrmClient::getBookingsByOrigin: Failed to fetch any records',
        expect.objectContaining({
          type: OriginType.TRAINER_BOOKER,
        }),
      );
    });
  });

  describe('markBookingAsCompensated', () => {
    test('should update the booking and booking product in CRM if booking does not have a payment status of recognised', async () => {
      mockCandidateBooking.origin = Origin.CITIZEN_PORTAL;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.DEFERRED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, true);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(2);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'false',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_tcn_update_date: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
    });

    test('should update the booking and booking product in CRM if booking does not have a payment status of recognised and origin is CSC', async () => {
      mockCandidateBooking.origin = Origin.CUSTOMER_SERVICES_CENTRE;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.DEFERRED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, true);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(2);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'true',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_tcn_update_date: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
    });

    test('should update the booking, booking product and finance transaction in CRM if booking has a payment status of recognised', async () => {
      mockCandidateBooking.origin = Origin.CITIZEN_PORTAL;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.RECOGNISED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, true);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(3);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'false',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_tcn_update_date: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_financetransactions',
        key: 'mock-finance-transaction-id',
        entity: {
          ftts_owedcompensationrecognised: false,
          ftts_owedcompensationbookingdate: mockNow,
        },
      });
    });

    test('should update the booking and booking product in CRM if booking does not have a payment status of recognised and TCN is false', async () => {
      mockCandidateBooking.origin = Origin.CITIZEN_PORTAL;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.DEFERRED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, false);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(2);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'false',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
    });

    test('should update the booking and booking product in CRM if booking does not have a payment status of recognised and origin is CSC and TCN is false', async () => {
      mockCandidateBooking.origin = Origin.CUSTOMER_SERVICES_CENTRE;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.DEFERRED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, false);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(2);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'true',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
    });

    test('should update the booking, booking product and finance transaction in CRM if booking has a payment status of recognised and TCN is false', async () => {
      mockCandidateBooking.origin = Origin.CITIZEN_PORTAL;
      mockCandidateBooking.financeTransactionStatus = FinanceTransactionStatus.RECOGNISED;

      await crmClient.markBookingAsCompensated(mockCandidateBooking, CancelReason.TEST_CENTRE_CANCELLED, false);

      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledTimes(3);
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookings',
        key: 'mock-booking-id',
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: mockNow,
          ftts_callamend: 'false',
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_bookingproducts',
        key: 'mock-booking-product-id',
        entity: {
          ftts_canceldate: mockNow,
          ftts_cancelreason: CancelReason.TEST_CENTRE_CANCELLED,
        },
      });
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith({
        collection: 'ftts_financetransactions',
        key: 'mock-finance-transaction-id',
        entity: {
          ftts_owedcompensationrecognised: false,
          ftts_owedcompensationbookingdate: mockNow,
        },
      });
    });

    test('throws error if the call fails', async () => {
      mockedDynamicsWebApi.executeBatch.mockRejectedValue('CRM went wrong');
      await expect(crmClient.markBookingAsCompensated(mockCandidateBooking, true)).rejects.toStrictEqual('CRM went wrong');
      await expect(crmClient.markBookingAsCompensated(mockCandidateBooking, false)).rejects.toStrictEqual('CRM went wrong');
    });
  });

  describe('batchUpdateBookedSlotTriggerAction', () => {
    const triggerAction = TriggerAction.CANCEL_WITH_OWED_COMPENSATION_CHANGE;
    const bookedSlotIds = ['mock-slot-id-1', 'mock-slot-id-2'];

    test('is called with the correct request parameters', async () => {
      await crmClient.batchUpdateBookedSlotTriggerAction(bookedSlotIds, triggerAction);

      expect(mockedDynamicsWebApi.startBatch).toHaveBeenCalled();
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith(expect.objectContaining({
        key: bookedSlotIds[0],
        collection: 'ftts_bookedslots',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        entity: expect.objectContaining({
          ftts_triggeraction: triggerAction,
        }),
      }));
      expect(mockedDynamicsWebApi.updateRequest).toHaveBeenCalledWith(expect.objectContaining({
        key: bookedSlotIds[1],
        collection: 'ftts_bookedslots',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        entity: expect.objectContaining({
          ftts_triggeraction: triggerAction,
        }),
      }));
      expect(mockedDynamicsWebApi.executeBatch).toHaveBeenCalled();
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKED_SLOT_CRM_CANCELLATION_SUCCEEDED,
        'CrmClient::batchUpdateBookedSlotTriggerAction: Sucessfully cancelled booked slots',
        {
          bookedSlotIds,
        },
      );
    });

    test('logs but does not throw an error when the call to CRM fails', async () => {
      const error = {
        message: 'CRM unsurprisingly failed',
      };
      mockedDynamicsWebApi.executeBatch.mockRejectedValue(error);

      await expect(crmClient.batchUpdateBookedSlotTriggerAction(bookedSlotIds, triggerAction)).rejects.toStrictEqual(error);

      expect(logger.event).toHaveBeenCalledTimes(1);
      expect(logger.event).toHaveBeenLastCalledWith(
        BusinessTelemetryEvents.BCP_BOOKED_SLOT_CRM_CANCELLATION_FAILED,
        'CrmClient::batchUpdateBookedSlotTriggerAction: Failed to update booked slot trigger action field',
        expect.objectContaining({
          bookedSlotIds,
          ...error,
        }),
      );
    });

    test('logs warn and returns if there aren\'t any bookedSlotIds supplied', async () => {
      await crmClient.batchUpdateBookedSlotTriggerAction([], triggerAction);

      expect(logger.warn).toHaveBeenCalledWith('CRMClient::batchUpdateBookedSlotTriggerAction: bookedSlotIds input array is empty');
      expect(mockedDynamicsWebApi.executeBatch).not.toHaveBeenCalled();
    });
  });
});
