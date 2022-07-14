import { logger } from '../../libraries/logger';
import { AzureBlobClient } from '../../services/azure-blob-client';
import { CandidateBooking } from '../../services/crm/types/bookings';
import { createCandidateBookingsCsvFile } from './candidate-csv-writer';
import { getBulkBookingsIdentifiers } from '../../utils/identifiers';

export const writeCandidateBookingsToCsv = async (bookings: CandidateBooking[], targetDirectory: string, azureBlobClient: AzureBlobClient): Promise<void> => {
  try {
    logger.debug('writeCandidateBookingsToCsv: bookings to write to csv', {
      bookings,
      ...getBulkBookingsIdentifiers(bookings),
    });
    const csvFile = createCandidateBookingsCsvFile(bookings);
    await azureBlobClient.uploadFile(`${targetDirectory}/candidateAndCSCBookerBookingProducts.csv`, csvFile);
  } catch (error) {
    logger.error(error as Error, 'writeCandidateBookingsToCsv: Failed to write bookings to csv', {
      ...getBulkBookingsIdentifiers(bookings),
    });
    throw error;
  }
};

export const writeNsaOrNoEmailBookingsToCsv = async (bookings: CandidateBooking[], targetDirectory: string, azureBlobClient: AzureBlobClient): Promise<void> => {
  const nsaOrNoEmailBookings = bookings.filter((booking) => booking.isNsaBooking || !booking.candidateEmail);
  await writeCandidateBookingsToCsv(nsaOrNoEmailBookings, targetDirectory, azureBlobClient);
};
