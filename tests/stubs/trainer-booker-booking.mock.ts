import { TrainerBookerBooking } from '../../src/services/crm/types/bookings';
import {
  BookingStatus, GovernmentAgency, Origin, ProductNumber,
} from '../../src/services/crm/types/enums';

export const buildMockTrainerBookerBooking = (trainerBookerBooking?: Partial<TrainerBookerBooking>): TrainerBookerBooking => ({
  organisationId: 'mock-organisation-id',
  organisationName: 'Random Company Co',
  organisationEmail: 'test@email.com',
  bookedSlotId: 'mock-booked-slot-id',
  bookedSlotReference: 'mock-booked-slot-ref',
  bookingProductId: 'mock-booking-product-id',
  bookingId: 'mock-booking-id',
  bookingProductReference: 'mock-booking-product-reference',
  bookingStatus: BookingStatus.ASSIGNED,
  bookingReference: 'mock-booking-reference',
  governmentAgency: GovernmentAgency.DVSA,
  testDate: new Date('2021-08-02T12:30:00.000Z'),
  price: 20,
  origin: Origin.TRAINER_BOOKER_PORTAL,
  testCentreId: 'mock-test-centre-id',
  testCentreName: 'Birmingham',
  testCentreRemit: 675030000,
  testCentreAddressLine1: 'Some Street',
  testCentreAddressLine2: 'Some area',
  testCentreAddressCity: 'Some City',
  testCentreAddressPostCode: 'PO57 CDE',
  tcnId: 'mock-tcn-id',
  tcnName: 'TCN B',
  isTcnRegionA: false,
  isTcnRegionB: true,
  isTcnRegionC: false,
  productId: 'mock-product-id',
  productName: 'Car',
  productNumber: ProductNumber.CAR,
  ...trainerBookerBooking,
});

export const buildMockTrainerBookerBookings = (length: number, trainerBookerBooking?: Partial<TrainerBookerBooking>): TrainerBookerBooking[] => Array.from({ length }).map(() => buildMockTrainerBookerBooking(trainerBookerBooking));
