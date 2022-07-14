import { BaseBooking } from '../services/crm/types/bookings';
import { Origin, OriginType } from '../services/crm/types/enums';

export const getBookingIdentifiers = (booking: Partial<BaseBooking>): Record<string, unknown> => ({
  origin: getOriginType(booking.origin as Origin),
  bookingProductId: booking.bookingProductId,
  bookingProductRef: booking.bookingProductReference,
  bookingId: booking.bookingId,
  bookingRef: booking.bookingReference,
});

export const getBulkBookingsIdentifiers = (bookings: Partial<BaseBooking>[]): Record<string, unknown> => ({
  origins: bookings.map((b) => getOriginType(b.origin as Origin)),
  bookingProductIds: bookings.map((b) => b.bookingProductId),
  bookingProductRefs: bookings.map((b) => b.bookingProductReference),
  bookingIds: bookings.map((b) => b.bookingId),
  bookingRefs: bookings.map((b) => b.bookingReference),
});

const getOriginType = (origin: Origin): OriginType => {
  if (origin === Origin.TRAINER_BOOKER_PORTAL) {
    return OriginType.TRAINER_BOOKER;
  }
  return OriginType.CANDIDATE;
};
