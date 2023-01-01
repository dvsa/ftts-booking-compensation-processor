import { mocked } from 'ts-jest/utils';
import { createTrainerBookingsCsvFile } from '../../../../src/booking-compensation-processor/trainer-booker/trainer-csv-writer';
import { writeTrainerBookingsToCsv } from '../../../../src/booking-compensation-processor/trainer-booker/write-trainer-bookings-to-csv';
import { logger } from '../../../../src/libraries/logger';
import { AzureBlobClient } from '../../../../src/services/azure-blob-client';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';

jest.mock('../../../../src/services/azure-blob-client');
const mockedAzureBlobClient = mocked(new AzureBlobClient());

jest.mock('../../../../src/services/crm/crm-client');
const mockedCrmClient = mocked(new CrmClient());

jest.mock('../../../../src/booking-compensation-processor/trainer-booker/trainer-csv-writer');
const mockedCreateTrainerBookingsCsvFile = mocked(createTrainerBookingsCsvFile);

describe('Write trainer bookings to csv', () => {
  const mockTargetDirectory = '/mock/target/directory';

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('writeTrainerBookingsToCsv', () => {
    test('writes all trainer bookings that are NSA or have no email address to a csv file in the target directory', async () => {
      const mockBookings = buildMockTrainerBookerBookings(3);
      mockBookings[0].organisationEmail = undefined;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      mockedCreateTrainerBookingsCsvFile.mockReturnValue('mockCsvFile');

      await writeTrainerBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient);

      expect(mockedCreateTrainerBookingsCsvFile).toHaveBeenCalledWith([mockBookings[0], mockBookings[1], mockBookings[2]]);
      expect(mockedAzureBlobClient.uploadFile).toHaveBeenCalledWith(
        `${mockTargetDirectory}/trainerBookerBookingProducts.csv`,
        'mockCsvFile',
      );
    });

    test('logs error if fails to write csv', async () => {
      const mockBookings = buildMockTrainerBookerBookings(3);
      mockBookings[0].organisationEmail = undefined;
      mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
      const error = new Error('error');
      mockedAzureBlobClient.uploadFile.mockRejectedValue(error);
      mockedCreateTrainerBookingsCsvFile.mockReturnValue('mockCsvFile');

      await expect(writeTrainerBookingsToCsv(mockBookings, mockTargetDirectory, mockedAzureBlobClient))
        .rejects
        .toStrictEqual(error);

      expect(logger.error).toHaveBeenCalledWith(
        error,
        'writeTrainerBookingsToCsv: Failed to write bookings to csv',
        expect.objectContaining({}),
      );
    });
  });
});
