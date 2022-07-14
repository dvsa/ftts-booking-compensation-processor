/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CandidateBooking } from '../../src/services/crm/types/bookings';
import {
  BookingStatus, Origin, ProductNumber, GovernmentAgency, FinanceTransactionStatus,
} from '../../src/services/crm/types/enums';
import { TestType } from '../../src/services/notification/types/enums';

export const buildMockCandidateBooking = (): CandidateBooking => ({
  bookingProductId: 'mock-booking-product-id',
  bookingProductReference: 'mock-booking-product-ref',
  bookingId: 'mock-booking-id',
  bookingReference: 'mock-booking-ref',
  bookingStatus: BookingStatus.CONFIRMED,
  cancellationReason: 'global pandemic happened',
  candidateId: 'mock-candidate-id',
  candidateFirstnames: 'Wendy',
  candidateSurname: 'Jones',
  candidateEmail: 'wendy@jones.com',
  candidateAddressLine1: '10 Some Street',
  candidateAddressCity: 'Some City',
  candidateAddressPostcode: 'T1 3ST',
  financeTransactionId: 'mock-finance-transaction-id',
  financeTransactionStatus: FinanceTransactionStatus.RECOGNISED,
  financeTransactionAmount: 23,
  governmentAgency: GovernmentAgency.DVSA,
  isNsaBooking: false,
  isTcnRegionA: false,
  isTcnRegionB: true,
  isTcnRegionC: false,
  origin: Origin.CITIZEN_PORTAL,
  price: 23,
  productId: 'mock-product-id',
  productName: TestType.CAR,
  productNumber: ProductNumber.CAR,
  tcnId: 'mock-tcn-id',
  tcnName: 'TCN B',
  testCentreAddressCity: 'Some Town',
  testCentreAddressLine1: 'TCN Line 1',
  testCentreAddressLine2: 'TCN Line 2',
  testCentreAddressPostCode: 'PO57 CDE',
  testCentreId: 'test-centre-001',
  testCentreName: 'Test Centre 1',
  testCentreRemit: 675030000,
  testDate: new Date('2021-08-02T12:30:00.000Z'),
});

export const buildMockCandidateBookings = (length: number): CandidateBooking[] => Array.from({ length }).map(buildMockCandidateBooking);
