import { createObjectCsvStringifier } from 'csv-writer';
import { TrainerBookerBooking } from '../../services/crm/types/bookings';

const trainerBookingsCsvStringifier = createObjectCsvStringifier({
  header: [
    { id: 'bookingReference', title: 'Booking reference' },
    { id: 'bookingProductReference', title: 'Booking Product reference' },
    { id: 'bookedSlotReference', title: 'Booking Slot reference' },
    { id: 'bookingDateTime', title: 'Booking date time' },
    { id: 'testCentre', title: 'Test Centre' },
    { id: 'testCentreNetwork', title: 'Test Centre Network' },
    { id: 'trainerHasEmail', title: 'Trainer Booker has an email' },
  ],
});

export const createTrainerBookingsCsvFile = (bookings: TrainerBookerBooking[]): string => {
  const records = bookings.map((booking) => ({
    bookingReference: booking.bookingReference,
    bookingProductReference: booking.bookingProductReference,
    bookedSlotReference: booking.bookedSlotReference,
    bookingDateTime: booking.testDate.toISOString(),
    testCentre: booking.testCentreName,
    testCentreNetwork: booking.tcnName,
    trainerHasEmail: !!booking.organisationEmail,
  }));
  const header = trainerBookingsCsvStringifier.getHeaderString() as string;
  const rows = trainerBookingsCsvStringifier.stringifyRecords(records);
  return `${header}${rows}`;
};
