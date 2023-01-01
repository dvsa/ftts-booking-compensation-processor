import { CandidateBooking, TrainerBookerBooking } from '../../../src/services/crm/types/bookings';
import { OriginType } from '../../../src/services/crm/types/enums';
import { getBookingIdentifiers, getBulkBookingsIdentifiers } from '../../../src/utils/identifiers';
import { buildMockCandidateBooking, buildMockCandidateBookings } from '../../stubs/candidate-booking.mock';
import { buildMockTrainerBookerBooking, buildMockTrainerBookerBookings } from '../../stubs/trainer-booker-booking.mock';

describe('identifiers', () => {
  let mockCandidateBooking: CandidateBooking;
  let mockCandidateBookings: CandidateBooking[];
  let mockTrainerBookerBooking: TrainerBookerBooking;
  let mockTrainerBookerBookings: TrainerBookerBooking[];

  beforeEach(() => {
    mockCandidateBooking = buildMockCandidateBooking();
    mockCandidateBookings = buildMockCandidateBookings(2);
    mockTrainerBookerBooking = buildMockTrainerBookerBooking();
    mockTrainerBookerBookings = buildMockTrainerBookerBookings(2);
  });

  describe('getBookingIdentifiers', () => {
    test('correctly maps booking identifiers for candidate bookings', () => {
      const bookingIdentifiers = getBookingIdentifiers(mockCandidateBooking);

      expect(bookingIdentifiers).toMatchObject({
        origin: OriginType.CANDIDATE,
        bookingProductId: mockCandidateBooking.bookingProductId,
        bookingProductRef: mockCandidateBooking.bookingProductReference,
        bookingId: mockCandidateBooking.bookingId,
        bookingRef: mockCandidateBooking.bookingReference,
      });
    });

    test('correctly maps booking identifiers for trainer booker bookings', () => {
      const bookingIdentifiers = getBookingIdentifiers(mockTrainerBookerBooking);

      expect(bookingIdentifiers).toMatchObject({
        origin: OriginType.TRAINER_BOOKER,
        bookingProductId: mockTrainerBookerBooking.bookingProductId,
        bookingProductRef: mockTrainerBookerBooking.bookingProductReference,
        bookingId: mockTrainerBookerBooking.bookingId,
        bookingRef: mockTrainerBookerBooking.bookingReference,
      });
    });

    test('handles missing fields correctly', () => {
      delete mockTrainerBookerBooking.bookingId;

      const bookingIdentifiers = getBookingIdentifiers(mockTrainerBookerBooking);

      expect(bookingIdentifiers).toMatchObject({
        origin: OriginType.TRAINER_BOOKER,
        bookingProductId: mockTrainerBookerBooking.bookingProductId,
        bookingProductRef: mockTrainerBookerBooking.bookingProductReference,
        bookingId: undefined,
        bookingRef: mockTrainerBookerBooking.bookingReference,
      });
    });
  });

  describe('getBulkBookingsIdentifiers', () => {
    test('correctly maps booking identifiers for multiple candidate bookings', () => {
      const bookingIdentifiers = getBulkBookingsIdentifiers(mockCandidateBookings);

      expect(bookingIdentifiers).toStrictEqual({
        origins: new Array(2).fill(OriginType.CANDIDATE),
        bookingProductIds: new Array(2).fill(mockCandidateBooking.bookingProductId),
        bookingProductRefs: new Array(2).fill(mockCandidateBooking.bookingProductReference),
        bookingIds: new Array(2).fill(mockCandidateBooking.bookingId),
        bookingRefs: new Array(2).fill(mockCandidateBooking.bookingReference),
      });
    });

    test('correctly maps booking identifiers for multiple trainer booker bookings', () => {
      const bookingIdentifiers = getBulkBookingsIdentifiers(mockTrainerBookerBookings);

      expect(bookingIdentifiers).toStrictEqual({
        origins: new Array(2).fill(OriginType.TRAINER_BOOKER),
        bookingProductIds: new Array(2).fill(mockTrainerBookerBooking.bookingProductId),
        bookingProductRefs: new Array(2).fill(mockTrainerBookerBooking.bookingProductReference),
        bookingIds: new Array(2).fill(mockTrainerBookerBooking.bookingId),
        bookingRefs: new Array(2).fill(mockTrainerBookerBooking.bookingReference),
      });
    });

    test('handles missing fields correctly', () => {
      mockTrainerBookerBookings.forEach((b) => {
        delete b.bookingId;
      });

      const bookingIdentifiers = getBulkBookingsIdentifiers(mockTrainerBookerBookings);

      expect(bookingIdentifiers).toStrictEqual({
        origins: new Array(2).fill(OriginType.TRAINER_BOOKER),
        bookingProductIds: new Array(2).fill(mockTrainerBookerBooking.bookingProductId),
        bookingProductRefs: new Array(2).fill(mockTrainerBookerBooking.bookingProductReference),
        bookingIds: new Array(2).fill(undefined),
        bookingRefs: new Array(2).fill(mockTrainerBookerBooking.bookingReference),
      });
    });
  });
});
