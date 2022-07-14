import { createCandidateBookingsCsvFile } from '../../../../src/booking-compensation-processor/candidate/candidate-csv-writer';
import { GovernmentAgency } from '../../../../src/services/crm/types/enums';
import { buildMockCandidateBookings } from '../../../stubs/candidate-booking.mock';

describe('CSV writer', () => {
  describe('createCandidateBookingsCsvFile', () => {
    test('creates csv file for given candidate bookings', () => {
      const mockBookings = buildMockCandidateBookings(2);
      mockBookings[0].bookingReference = '001';
      mockBookings[0].candidateEmail = undefined;
      mockBookings[1].bookingReference = '002';
      mockBookings[1].governmentAgency = GovernmentAgency.DVA;

      const output = createCandidateBookingsCsvFile(mockBookings);

      const expectedRows = [
        'Booking reference,Booking Product reference,Booking date time,Is NSA booking,Agency,Test Centre,Test Centre Network,Candidate has an email',
        '001,mock-booking-product-ref,2021-08-02T12:30:00.000Z,false,DVSA,Test Centre 1,TCN B,false',
        '002,mock-booking-product-ref,2021-08-02T12:30:00.000Z,false,DVA,Test Centre 1,TCN B,true\n',
      ];
      expect(output).toBe(expectedRows.join('\n'));
    });
  });
});
