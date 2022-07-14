import { logger } from '../../libraries/logger';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { getBookingIdentifiers } from '../identifiers';

export const validatePostalAddress = (candidateBooking: CandidateBooking): boolean => {
  const requiredFields: (keyof CandidateBooking)[] = [
    'candidateFirstnames',
    'candidateSurname',
    'candidateAddressLine1',
    'candidateAddressPostcode',
  ];
  // eslint-disable-next-line no-restricted-syntax
  for (const field of requiredFields) {
    // eslint-disable-next-line security/detect-object-injection
    if (candidateBooking[field] === undefined || candidateBooking[field] === null || (candidateBooking[field] as unknown as string) === '') {
      logger.warn(`ValidatePostalAddress:: The field ${field} is missing`, {
        ...getBookingIdentifiers(candidateBooking),
        field,
      });
      return false;
    }
  }
  if (!(candidateBooking.candidateAddressLine2
    || candidateBooking.candidateAddressLine3
    || candidateBooking.candidateAddressLine4
    || candidateBooking.candidateAddressCity)) {
    logger.warn('ValidatePostalAddress:: At least one of the fields from candidateAddressLine2, candidateAddressLine3, candidateAddressLine4 and candidateAddressCity is missing', {
      ...getBookingIdentifiers(candidateBooking),
    });
    return false;
  }
  return true;
};
