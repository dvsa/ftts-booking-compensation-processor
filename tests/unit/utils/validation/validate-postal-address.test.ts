import { getBookingIdentifiers } from '../../../../src/utils/identifiers';
import { validatePostalAddress } from '../../../../src/utils/validation/validate-postal-address';
import { buildMockCandidateBooking } from '../../../stubs/candidate-booking.mock';
import mockedLogger from '../../../stubs/logger.mock';

describe('validatePostalAddress', () => {
  describe('valid postal address - returns true', () => {
    test('all properties defined', () => {
      const mockBooking = buildMockCandidateBooking();
      expect(validatePostalAddress(mockBooking)).toBe(true);
    });
  });

  describe('invalid postal address - returns false', () => {
    test('undefined address property', () => {
      const mockBooking = buildMockCandidateBooking();
      mockBooking.candidateAddressLine1 = undefined;

      expect(validatePostalAddress(mockBooking)).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalledWith('ValidatePostalAddress:: The field candidateAddressLine1 is missing', {
        ...getBookingIdentifiers(mockBooking),
        field: 'candidateAddressLine1',
      });
    });
  });

  describe('invalid postcode address - returns false', () => {
    test('undefined address property', () => {
      const mockBooking = buildMockCandidateBooking();
      mockBooking.candidateAddressPostcode = undefined;

      expect(validatePostalAddress(mockBooking)).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalledWith('ValidatePostalAddress:: The field candidateAddressPostcode is missing', {
        ...getBookingIdentifiers(mockBooking),
        field: 'candidateAddressPostcode',
      });
    });
  });
  describe('invalid postal address city - returns false', () => {
    test('undefined address property', () => {
      const mockBooking = buildMockCandidateBooking();
      mockBooking.candidateAddressLine2 = undefined;
      mockBooking.candidateAddressLine3 = undefined;
      mockBooking.candidateAddressLine4 = undefined;
      mockBooking.candidateAddressCity = undefined;

      expect(validatePostalAddress(mockBooking)).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalledWith('ValidatePostalAddress:: At least one of the fields from candidateAddressLine2, candidateAddressLine3, candidateAddressLine4 and candidateAddressCity is missing', {
        ...getBookingIdentifiers(mockBooking),
      });
    });
  });
});
