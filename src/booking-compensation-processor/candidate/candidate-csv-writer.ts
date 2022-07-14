import { createObjectCsvStringifier } from 'csv-writer';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { GovernmentAgency } from '../../services/crm/types/enums';

const candidateBookingsCsvStringifier = createObjectCsvStringifier({
  header: [
    { id: 'bookingReference', title: 'Booking reference' },
    { id: 'bookingProductReference', title: 'Booking Product reference' },
    { id: 'bookingDateTime', title: 'Booking date time' },
    { id: 'isNsaBooking', title: 'Is NSA booking' },
    { id: 'agency', title: 'Agency' },
    { id: 'testCentre', title: 'Test Centre' },
    { id: 'testCentreNetwork', title: 'Test Centre Network' },
    { id: 'candidateHasEmail', title: 'Candidate has an email' },
  ],
});

export const createCandidateBookingsCsvFile = (bookings: CandidateBooking[]): string => {
  const records = bookings.map((booking) => ({
    bookingReference: booking.bookingReference,
    bookingProductReference: booking.bookingProductReference,
    bookingDateTime: booking.testDate.toISOString(),
    isNsaBooking: booking.isNsaBooking,
    agency: booking.governmentAgency === GovernmentAgency.DVA ? 'DVA' : 'DVSA',
    testCentre: booking.testCentreName,
    testCentreNetwork: booking.tcnName,
    candidateHasEmail: !!booking.candidateEmail,
  }));
  const header = candidateBookingsCsvStringifier.getHeaderString() as string;
  const rows = candidateBookingsCsvStringifier.stringifyRecords(records);
  return `${header}${rows}`;
};
