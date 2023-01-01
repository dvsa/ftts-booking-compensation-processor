import { logger } from '../../libraries/logger';
import { AzureBlobClient } from '../../services/azure-blob-client';
import { TrainerBookerBooking } from '../../services/crm/types/bookings';
import { getBulkBookingsIdentifiers } from '../../utils/identifiers';
import { createTrainerBookingsCsvFile } from './trainer-csv-writer';

export const writeTrainerBookingsToCsv = async (bookings: TrainerBookerBooking[], targetDirectory: string, azureBlobClient: AzureBlobClient): Promise<void> => {
  try {
    logger.debug('writeTrainerBookingsToCsv: bookings to write to csv', {
      bookings,
      ...getBulkBookingsIdentifiers(bookings),
    });
    const csvFile = createTrainerBookingsCsvFile(bookings);
    await azureBlobClient.uploadFile(`${targetDirectory}/trainerBookerBookingProducts.csv`, csvFile);
  } catch (error) {
    logger.error(error as Error, 'writeTrainerBookingsToCsv: Failed to write bookings to csv', {
      ...getBulkBookingsIdentifiers(bookings),
    });
    throw error;
  }
};
