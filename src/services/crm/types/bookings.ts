import {
  BookingStatus, GovernmentAgency, Origin, ProductNumber, FinanceTransactionStatus, CancelReason,
} from './enums';
import { TestType } from '../../notification/types/enums';

export interface BaseBooking {
  bookingProductId: string;
  bookingProductReference: string;
  bookingId: string;
  bookingReference: string;
  bookingStatus: BookingStatus;
  governmentAgency: GovernmentAgency;
  testCentreRemit: number;
  isTcnRegionA: boolean;
  isTcnRegionB: boolean;
  isTcnRegionC: boolean;
  origin: Origin;
  price: number;
  tcnId: string;
  tcnName: string;
  testCentreId: string;
  testCentreName: string;
  testCentreAddressLine1: string;
  testCentreAddressLine2: string;
  testCentreAddressCity: string;
  testCentreAddressPostCode: string;
  testDate: Date;
  testType?: TestType;
  productId: string;
  productName: string;
  productNumber: ProductNumber;
}

export interface CandidateBooking extends BaseBooking {
  cancellationReason: string;
  candidateId: string;
  candidateFirstnames: string;
  candidateSurname: string;
  candidateEmail?: string;
  candidateAddressLine1?: string;
  candidateAddressLine2?: string;
  candidateAddressLine3?: string;
  candidateAddressLine4?: string;
  candidateAddressCity?: string;
  candidateAddressPostcode?: string;
  financeTransactionId?: string;
  financeTransactionStatus?: FinanceTransactionStatus;
  financeTransactionAmount?: number;
  governmentAgency: GovernmentAgency;
  isNsaBooking: boolean;
}

export interface TrainerBookerBooking extends BaseBooking {
  organisationEmail?: string;
  organisationName: string;
  organisationId: string;
  bookedSlotId: string;
  bookedSlotReference: string;
}

export interface UpdatedCRMBookingProduct {
  ftts_canceldate?: string;
  ftts_tcn_update_date?: string;
  ftts_cancelreason?: CancelReason;
}

export const baseBookingRequiredFields: (keyof BaseBooking)[] = [
  'bookingProductId', 'bookingProductReference', 'bookingId', 'bookingReference', 'bookingStatus',
  'testDate', 'price', 'origin', 'testCentreId', 'testCentreName',
  'testCentreRemit', 'tcnId', 'tcnName', 'isTcnRegionA', 'isTcnRegionB', 'isTcnRegionC',
  'productId', 'productName', 'productNumber',
];

export const candidateBookingRequiredFields: (keyof CandidateBooking)[] = [
  ...baseBookingRequiredFields, 'isNsaBooking',
  'candidateId', 'candidateFirstnames', 'candidateSurname', 'governmentAgency',
];

export const trainerBookerBookingRequiredFields: (keyof TrainerBookerBooking)[] = [
  ...baseBookingRequiredFields, 'organisationName', 'organisationId',
  'bookedSlotId', 'bookedSlotReference',
];
