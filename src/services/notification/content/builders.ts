/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Not passing user input so safe to ignore
/* eslint-disable security/detect-object-injection */
import forOwn from 'lodash.forown';
import { content } from '.';
import {
  Target, EmailType, TestType, LetterType,
} from '../types/enums';
import { CandidateBooking, TrainerBookerBooking, BaseBooking } from '../../crm/types/bookings';
import { EmailContent, LetterContent, BookingCancellationDetails } from '../types';
import { logger } from '../../../libraries/logger';
import { getBookingIdentifiers } from '../../../utils/identifiers';

export const buildTrainerBookerBookingCancellationEmailContent = async (
  bookingsGroupedByBookedSlotId: _.Dictionary<TrainerBookerBooking[]>,
  cancellationReason: string,
): Promise<EmailContent> => {
  const body: BookingCancellationDetails[] = [];
  forOwn(bookingsGroupedByBookedSlotId, (bookings) => {
    bookings.forEach((booking) => {
      const testType = productNumberToTestType(booking);
      body.push({
        bookedSlotReference: booking.bookedSlotReference,
        bookingRef: booking.bookingReference,
        testCentre: {
          name: booking.testCentreName,
          testCentreAddressLine1: booking.testCentreAddressLine1,
          testCentreAddressLine2: booking.testCentreAddressLine2,
          testCentreAddressCity: booking.testCentreAddressCity,
          testCentreAddressPostCode: booking.testCentreAddressPostCode,
        },
        testDateTime: booking.testDate.toISOString(),
        testType,
        reason: cancellationReason,
      });
    });
  });
  const { subject, buildBody } = content.email[EmailType.TRAINER_BOOKER_BOOKING_CANCELLATION][Target.GB];
  return {
    subject,
    body: await buildBody(body, cancellationReason, Target.GB),
  };
};

export const buildCandidateBookingCancellationEmailContent = async (booking: CandidateBooking, target: Target): Promise<EmailContent> => {
  const { subject, buildBody } = content.email[EmailType.CANDIDATE_BOOKING_CANCELLATION][target];

  const body = {
    bookingRef: booking.bookingReference,
    reason: booking.cancellationReason,
    testCentre: {
      name: booking.testCentreName,
      testCentreAddressLine1: booking.testCentreAddressLine1,
      testCentreAddressLine2: booking.testCentreAddressLine2,
      testCentreAddressCity: booking.testCentreAddressCity,
      testCentreAddressPostCode: booking.testCentreAddressPostCode,
    },
    testDateTime: booking.testDate.toISOString(),
    testType: productNumberToTestType(booking),
  };

  return {
    subject,
    body: await buildBody(body, target),
  };
};

export const buildCandidateBookingCancellationLetterContent = async (booking: CandidateBooking, target: Target): Promise<LetterContent> => {
  const { buildBody } = content.letter[LetterType.BOOKING_CANCELLATION][target];
  const body = {
    bookingRef: booking.bookingReference,
    reason: booking.cancellationReason,
    testCentre: {
      name: booking.testCentreName,
      testCentreAddressLine1: booking.testCentreAddressLine1,
      testCentreAddressLine2: booking.testCentreAddressLine2,
      testCentreAddressCity: booking.testCentreAddressCity,
      testCentreAddressPostCode: booking.testCentreAddressPostCode,
    },
    testDateTime: booking.testDate.toISOString(),
    testType: productNumberToTestType(booking),
  };

  return {
    body: await buildBody(body, target),
  };
};

const productNumberToTestType = (booking: BaseBooking): TestType => {
  let testType: TestType;
  switch (booking.productNumber) {
    case '1001':
      testType = TestType.CAR;
      break;
    case '2001':
      testType = TestType.MOTORCYCLE;
      break;
    case '3001':
      testType = TestType.LGVMC;
      break;
    case '3002':
      testType = TestType.LGVHPT;
      break;
    case '3003':
      testType = TestType.LGVCPC;
      break;
    case '3004':
      testType = TestType.LGVCPCC;
      break;
    case '4001':
      testType = TestType.PCVMC;
      break;
    case '4002':
      testType = TestType.PCVHPT;
      break;
    case '4003':
      testType = TestType.PCVCPC;
      break;
    case '4004':
      testType = TestType.PCVCPCC;
      break;
    case '5001':
      testType = TestType.ADIP1;
      break;
    case '5002':
      testType = TestType.ADIHPT;
      break;
    case '5003':
      testType = TestType.ADIP1DVA;
      break;
    case '6001':
      testType = TestType.ERS;
      break;
    case '7001':
      testType = TestType.AMIP1;
      break;
    case '8001':
      testType = TestType.TAXI;
      break;
    default:
      logger.warn('Builders: No product mapping found for Test Type. Resorting to CAR', {
        ...getBookingIdentifiers(booking),
      });
      testType = TestType.CAR;
  }
  return testType;
};
