import { LetterAddress } from '../../../src/services/notification/types';
import { mapToLetterAddress } from '../../../src/utils/map-address';
import { buildMockCandidateBooking } from '../../stubs/candidate-booking.mock';

describe('mapToLetterAddress - maps candidate booking address fields to LetterAddress filling as many address lines as available', () => {
  test('no address lines', () => {
    const mockCandidateBooking = buildMockCandidateBooking();
    mockCandidateBooking.candidateAddressCity = '';

    const result = mapToLetterAddress(mockCandidateBooking);

    expect(result).toStrictEqual<LetterAddress>({
      name: 'Wendy Jones',
      address_line_1: '10 Some Street',
      address_line_2: undefined as unknown as string,
      address_line_3: undefined,
      address_line_4: undefined,
      address_line_5: undefined,
      postcode: 'T1 3ST',
    });
  });

  test('some address lines', () => {
    const mockCandidateBooking = buildMockCandidateBooking();
    mockCandidateBooking.candidateAddressLine4 = null as unknown as string;

    const result = mapToLetterAddress(mockCandidateBooking);

    expect(result).toStrictEqual<LetterAddress>({
      name: 'Wendy Jones',
      address_line_1: '10 Some Street',
      address_line_2: 'Some City',
      address_line_3: undefined,
      address_line_4: undefined,
      address_line_5: undefined,
      postcode: 'T1 3ST',
    });
  });

  test('all address lines', () => {
    const mockCandidateBooking = buildMockCandidateBooking();
    mockCandidateBooking.candidateAddressLine2 = 'Address line 2';
    mockCandidateBooking.candidateAddressLine3 = 'Address line 3';
    mockCandidateBooking.candidateAddressLine4 = 'Address line 4';

    const result = mapToLetterAddress(mockCandidateBooking);

    expect(result).toStrictEqual<LetterAddress>({
      name: 'Wendy Jones',
      address_line_1: '10 Some Street',
      address_line_2: 'Address line 2',
      address_line_3: 'Address line 3',
      address_line_4: 'Address line 4',
      address_line_5: 'Some City',
      postcode: 'T1 3ST',
    });
  });
});
