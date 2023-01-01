/* eslint-disable @typescript-eslint/ban-ts-comment */
import { OriginType } from '../../../../../src/services/crm/types/enums';
import { typeGuards } from '../../../../../src/services/crm/types/type-guards';
import { buildMockCandidateBooking } from '../../../../stubs/candidate-booking.mock';
import mockedLogger from '../../../../stubs/logger.mock';
import { buildMockTrainerBookerBooking } from '../../../../stubs/trainer-booker-booking.mock';

describe('Type guards', () => {
  describe('CandidateBooking', () => {
    test('returns true if has all required fields', () => {
      const mockCandidateBooking = buildMockCandidateBooking();

      const result = typeGuards.CandidateBooking(mockCandidateBooking);

      expect(result).toBe(true);
    });

    test('returns false and logs if missing some required fields', () => {
      const mockCandidateBooking = buildMockCandidateBooking();
      // mockCandidateBooking is expecting values for bookingStatus and candidateFirstnames so need to ignore any errors.
      /* @ts-ignore */
      delete mockCandidateBooking.bookingStatus;
      /* @ts-ignore */
      delete mockCandidateBooking.candidateFirstnames;

      const result = typeGuards.CandidateBooking(mockCandidateBooking);

      expect(result).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'typeGuards::hasRequiredFields: Malformed record - missing required field(s): bookingStatus, candidateFirstnames',
        {
          origin: OriginType.CANDIDATE,
          bookingProductId: mockCandidateBooking.bookingProductId,
          bookingId: mockCandidateBooking.bookingId,
          bookingProductRef: mockCandidateBooking.bookingProductReference,
          bookingRef: mockCandidateBooking.bookingReference,
          missingFields: ['bookingStatus', 'candidateFirstnames'],
        },
      );
    });
  });

  describe('TrainerBookerBooking', () => {
    test('returns true if has all required fields', () => {
      const mockTrainerBookerBooking = buildMockTrainerBookerBooking();

      const result = typeGuards.TrainerBookerBooking(mockTrainerBookerBooking);

      expect(result).toBe(true);
    });

    test('returns false and logs if missing some required fields', () => {
      const mockTrainerBookerBooking = buildMockTrainerBookerBooking();
      // mockCandidateBooking is expecting values for bookingStatus and candidateFirstnames so need to ignore any errors.
      /* @ts-ignore */
      delete mockTrainerBookerBooking.bookingStatus;
      /* @ts-ignore */
      delete mockTrainerBookerBooking.productNumber;

      const result = typeGuards.TrainerBookerBooking(mockTrainerBookerBooking);

      expect(result).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'typeGuards::hasRequiredFields: Malformed record - missing required field(s): bookingStatus, productNumber',
        {
          origin: OriginType.TRAINER_BOOKER,
          bookingProductId: mockTrainerBookerBooking.bookingProductId,
          bookingId: mockTrainerBookerBooking.bookingId,
          bookingProductRef: mockTrainerBookerBooking.bookingProductReference,
          bookingRef: mockTrainerBookerBooking.bookingReference,
          missingFields: ['bookingStatus', 'productNumber'],
        },
      );
    });
  });
});
