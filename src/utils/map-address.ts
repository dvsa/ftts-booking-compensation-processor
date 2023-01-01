import { CandidateBooking } from '../services/crm/types/bookings';
import { LetterAddress } from '../services/notification/types';

/**
 * Map candidate booking address fields to Letter address lines, using as many lines as available and in order.
 */
export const mapToLetterAddress = (candidateBooking: CandidateBooking): LetterAddress => {
  const optionalAddressFields = [
    candidateBooking.candidateAddressLine2,
    candidateBooking.candidateAddressLine3,
    candidateBooking.candidateAddressLine4,
    candidateBooking.candidateAddressCity,
  ];
  return {
    name: `${candidateBooking.candidateFirstnames} ${candidateBooking.candidateSurname}`,
    // Assume we've validated for address line 1, postcode and at least one optional address field
    address_line_1: candidateBooking.candidateAddressLine1 as string,
    postcode: candidateBooking.candidateAddressPostcode as string,
    address_line_2: takeNextAddressLine(optionalAddressFields) as string,
    address_line_3: takeNextAddressLine(optionalAddressFields),
    address_line_4: takeNextAddressLine(optionalAddressFields),
    address_line_5: takeNextAddressLine(optionalAddressFields),
  };
};

const takeNextAddressLine = (addressLines: (string | undefined)[]): string | undefined => {
  const nextLineIndex = addressLines.findIndex((addressLine) => (addressLine !== undefined && addressLine !== null && addressLine !== ''));
  if (nextLineIndex !== -1) {
    return addressLines.splice(nextLineIndex, 1)[0];
  }
  return undefined;
};
