import { mocked } from 'ts-jest/utils';
import { writeCandidateBookingsToCsv, writeNsaOrNoEmailBookingsToCsv } from '../../../../src/booking-compensation-processor/candidate/write-candidate-bookings-to-csv';
import { logger } from '../../../../src/libraries/logger';
import { AzureBlobClient } from '../../../../src/services/azure-blob-client';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { createCandidateBookingsCsvFile } from '../../../../src/booking-compensation-processor/candidate/candidate-csv-writer';
import { buildMockCandidateBookings } from '../../../stubs/candidate-booking.mock';

jest.mock('../../../../src/services/azure-blob-client');
const mockedAzureBlobClient = mocked(new AzureBlobClient());

jest.mock('../../../../src/services/crm/crm-client');
const mockedCrmClient = mocked(new CrmClient());

jest.mock('../../../../src/booking-compensation-processor/candidate/candidate-csv-writer');
const mockedCreateCandidateBookingsCsvFile = mocked(createCandidateBookingsCsvFile);

describe('Write candidate bookings to csv', () => {
  const mockTargetDirectory = '/mock/target/directory';

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('writeCandidateBookingsToCsv', () => {
    test('writes all candidate bookings that are NSA or have no email address to a csv file in the target directory', async () => {
      const mockBookings = buildMockCandidateBookings(3);
      mockBookings[0].candidateEmail = undefined;
      mockBookings[2].isNsaBooking = true;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      mockedCreateCandidateBookingsCsvFile.mockReturnValue('mockCsvFile');

      await writeCandidateBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient);

      expect(mockedCreateCandidateBookingsCsvFile).toHaveBeenCalledWith([mockBookings[0], mockBookings[1], mockBookings[2]]);
      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        `${mockTargetDirectory}/candidateAndCSCBookerBookingProducts.csv`,
        'mockCsvFile',
      );
    });

    test('logs error if fails to write csv', async () => {
      const mockBookings = buildMockCandidateBookings(3);
      mockBookings[0].candidateEmail = undefined;
      mockBookings[2].isNsaBooking = true;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      const error = new Error('error');
      mockedAzureBlobClient.uploadFile.mockRejectedValue(error);
      mockedCreateCandidateBookingsCsvFile.mockReturnValue('mockCsvFile');

      await expect(writeCandidateBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient))
        .rejects
        .toStrictEqual(error);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'writeCandidateBookingsToCsv: Failed to write bookings to csv',
        expect.objectContaining({}),
      );
    });
  });

  describe('writeNsaOrNoEmailBookingsToCsv', () => {
    test('writes all candidate bookings that are NSA or have no email address to a csv file in the target directory', async () => {
      const mockBookings = buildMockCandidateBookings(3);
      mockBookings[0].candidateEmail = undefined;
      mockBookings[2].isNsaBooking = true;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      mockedCreateCandidateBookingsCsvFile.mockReturnValue('mockCsvFile');

      await writeNsaOrNoEmailBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient);

      expect(mockedCreateCandidateBookingsCsvFile).toHaveBeenCalledWith([mockBookings[0], mockBookings[2]]);
      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        `${mockTargetDirectory}/candidateAndCSCBookerBookingProducts.csv`,
        'mockCsvFile',
      );
    });

    test('logs error if fails to write csv', async () => {
      const mockBookings = buildMockCandidateBookings(3);
      mockBookings[0].candidateEmail = undefined;
      mockBookings[2].isNsaBooking = true;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      const error = new Error('error');
      mockedAzureBlobClient.uploadFile.mockRejectedValue(error);
      mockedCreateCandidateBookingsCsvFile.mockReturnValue('mockCsvFile');

      await expect(writeNsaOrNoEmailBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient))
        .rejects
        .toStrictEqual(error);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'writeCandidateBookingsToCsv: Failed to write bookings to csv',
        expect.objectContaining({}),
      );
    });
  });
});
