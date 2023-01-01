import { createTrainerBookingsCsvFile } from '../../../../src/booking-compensation-processor/trainer-booker/trainer-csv-writer';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';

describe('CSV writer', () => {
  describe('createTrainerBookingsCsvFile', () => {
    test('creates csv file for given trainer bookings', () => {
      const mockBookings = buildMockTrainerBookerBookings(2);
      mockBookings[0].bookingReference = '001';
      mockBookings[0].organisationEmail = undefined;
      mockBookings[1].bookingReference = '002';

      const output = createTrainerBookingsCsvFile(mockBookings);

      const expectedRows = [
        'Booking reference,Booking Product reference,Booking Slot reference,Booking date time,Test Centre,Test Centre Network,Trainer Booker has an email',
        '001,mock-booking-product-reference,mock-booked-slot-ref,2021-08-02T12:30:00.000Z,Birmingham,TCN B,false',
        '002,mock-booking-product-reference,mock-booked-slot-ref,2021-08-02T12:30:00.000Z,Birmingham,TCN B,true\n',
      ];
      expect(output).toBe(expectedRows.join('\n'));
    });
  });
});
