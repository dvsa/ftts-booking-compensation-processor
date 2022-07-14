import { TestType } from './enums';

export interface Centre {
  name: string;
  testCentreAddressLine1: string;
  testCentreAddressLine2: string;
  testCentreAddressCity: string;
  testCentreAddressPostCode: string;
}

export interface EmailContent {
  subject: string;
  body: string;
}

export interface BookingCancellationDetails {
  bookedSlotReference?: string;
  bookingRef: string;
  reason: string;
  testCentre: Centre;
  testDateTime: string;
  testType: TestType;
}

export interface LetterAddress {
  name: string,
  address_line_1: string,
  address_line_2: string,
  address_line_3?: string,
  address_line_4?: string,
  address_line_5?: string,
  address_line_6?: string,
  postcode: string,
}

export interface LetterContent {
  body: string
}
