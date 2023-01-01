// Safe to disable - not passing any user input here
/* eslint-disable security/detect-object-injection */
import {
  BaseBooking,
  CandidateBooking,
  candidateBookingRequiredFields,
  TrainerBookerBooking,
  trainerBookerBookingRequiredFields,
} from './bookings';
import { getBookingIdentifiers } from '../../../utils/identifiers';
import { logger } from '../../../libraries/logger';

const hasRequiredFields = <T extends BaseBooking>(requiredFields: (keyof T)[], object: Partial<T>): object is T => {
  const missingFields: (keyof T)[] = [];
  requiredFields.forEach((field) => {
    if (object[field] === undefined || object[field] === null || (object[field] as unknown as string) === '') {
      missingFields.push(field);
    }
  });
  if (missingFields.length > 0) {
    logger.warn(`typeGuards::hasRequiredFields: Malformed record - missing required field(s): ${missingFields.join(', ')}`, {
      missingFields,
      ...getBookingIdentifiers(object),
    });
    return false;
  }
  return true;
};

export const typeGuards = {
  CandidateBooking: (object: Partial<CandidateBooking>): object is CandidateBooking => hasRequiredFields(candidateBookingRequiredFields, object),
  TrainerBookerBooking: (object: Partial<TrainerBookerBooking>): object is TrainerBookerBooking => hasRequiredFields(trainerBookerBookingRequiredFields, object),
};
