/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ContainerClient } from '@azure/storage-blob';
import { CRMTestClient } from '@dvsa/ftts-crm-test-client';
import {
  CRMBookingStatus, CRMOrigin, CRMPersonType, CRMProductNumber, CRMCancelReason,
} from '@dvsa/ftts-crm-test-client/dist/enums';
import { v4 as uuidv4 } from 'uuid';
import { Candidate } from '@dvsa/ftts-crm-test-client/dist/types';
import { config } from '../../src/config';
import { JobDescriptor } from '../../src/types';
import { runFunction, sleep, waitUntilJobIsDone } from './function-utils';
import {
  deleteAllBlobs, getContainerClient, listBlobPaths, retrieveCsvString, uploadBlob,
} from './blob-utils';
import { parseCsv } from './csv-parse-utils';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const INT_TEST_CENTRE_ID = config.test.testCentreId; // BCP INT Tests Test Centre

const hasJobFileBeenDeleted = (azureBlobContainerClient: ContainerClient, jobName: string) => async (): Promise<boolean> => {
  const jobFilePath = `jobs/${jobName}.json`;
  const blobPaths = await listBlobPaths(azureBlobContainerClient);
  return !blobPaths.includes(jobFilePath);
};

const buildJobDescriptor = (date: string): JobDescriptor => ({
  dateFrom: `${date}T14:06:00Z`,
  dateTo: `${date}T14:08:00Z`,
  allTestCentres: false,
  testCentreIds: [INT_TEST_CENTRE_ID],
  businessCancelReason: 'global pandemic happened',
  cancelReasonCode: CRMCancelReason.TEST_CENTRE_CANCELLED,
  dryRun: false,
});

const buildDryRunJobDescriptor = (date: string): JobDescriptor => ({
  ...buildJobDescriptor(date),
  dryRun: true,
});

const buildCandidateBookingsJobDescriptor = (date: string): JobDescriptor => ({
  ...buildJobDescriptor(date),
  ignoreCandidateBookings: false,
  ignoreTrainerBookerBookings: true,
});

const buildTrainerBookerBookingsJobDescriptor = (date: string): JobDescriptor => ({
  ...buildJobDescriptor(date),
  ignoreCandidateBookings: true,
  ignoreTrainerBookerBookings: false,
});

const uploadJobFile = async (azureBlobContainerClient: ContainerClient, jobName: string, jobDescriptor: JobDescriptor) => {
  const mockJobFilePath = `jobs/${jobName}.json`;
  const mockJobFileContent = JSON.stringify(jobDescriptor);
  await uploadBlob(azureBlobContainerClient, mockJobFilePath, mockJobFileContent);
};

const MAX_TRIES = 60;
const TIMEOUT = 3000;
jest.setTimeout(MAX_TRIES * TIMEOUT);

describe('Booking compensation processor integration tests', () => {
  const mockJobName = 'integration-test-job';
  let azureBlobContainerClient: ContainerClient;
  let crmTestClient: CRMTestClient;
  let futureTestDate: string;
  let licenceNumber: string;
  let candidateAndLicence: Candidate;

  beforeAll(() => {
    azureBlobContainerClient = getContainerClient(config.azureBlob.connectionString, config.azureBlob.containerName);
    crmTestClient = new CRMTestClient();
    futureTestDate = dayjs().add(1, 'month').add(1, 'day').format('YYYY-MM-DD');
  });

  describe('job descriptor', () => {
    beforeEach(async () => {
      await deleteAllBlobs(azureBlobContainerClient);
    });

    test('target directory is created with job file copied to it, csv file created and original job file deleted', async () => {
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const blobPaths = await listBlobPaths(azureBlobContainerClient);
      const timestampFormat = '\\d{8}_\\d{6}';
      const expectedTargetDirectoryPath = `job-runs/${mockJobName}/${timestampFormat}`;
      expect(blobPaths).toHaveLength(2);
      expect(blobPaths).toContainEqual(expect.stringMatching(`^${expectedTargetDirectoryPath}/${mockJobName}.json$`));
      expect(blobPaths).toContainEqual(expect.stringMatching(`^${expectedTargetDirectoryPath}/candidateAndCSCBookerBookingProducts.csv$`));
    });

    test('invalid job descriptor, BCP aborts and does not delete the file', async () => {
      const mockJobDescriptor: JobDescriptor = {
        dateFrom: '2021-10-01T14:06:00Z',
        dateTo: '2021-09-01T14:08:00Z',
        testCentreIds: [INT_TEST_CENTRE_ID],
        reason: 'global pandemic happened',
        dryRun: false,
        ignoreTrainerBookerBookings: true,
      };
      const mockJobFilePath = `jobs/${mockJobName}.json`;
      const mockJobFileContent = JSON.stringify(mockJobDescriptor);
      await uploadBlob(azureBlobContainerClient, mockJobFilePath, mockJobFileContent);

      await runFunction();
      await sleep(5000);

      const blobPaths = await listBlobPaths(azureBlobContainerClient);
      expect(blobPaths).toContainEqual(mockJobFilePath);
    });

    test('dry run, candidate and trainer booker bookings are written to csv and not updated in CRM', async () => {
      licenceNumber = uuidv4();
      candidateAndLicence = await crmTestClient.createNewCandidate(licenceNumber, { ftts_persontype: CRMPersonType.Candidate });
      const candidateBooking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const trainerBookerBooking = await crmTestClient.createNewTrainerBookerBooking(candidateAndLicence, CRMBookingStatus.Unassigned, CRMProductNumber.CAR,
        {
          ftts_bookingstatus: CRMBookingStatus.Confirmed,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildDryRunJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedCandidateBooking = await crmTestClient.retrieveBooking(candidateBooking.bookingId);
      expect(retrievedCandidateBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Confirmed); // No change
      expect(retrievedCandidateBooking.ftts_owedcompbookingassigned).toBeNull();
      const candidateBookingsCsvString = await retrieveCsvString(azureBlobContainerClient, 'candidateAndCSCBookerBookingProducts');
      const candidateBookingsRows = parseCsv(candidateBookingsCsvString);
      expect(candidateBookingsRows).toContainEqual(expect.objectContaining({
        bookingReference: retrievedCandidateBooking.ftts_reference,
      }));
      const retrievedTrainerBookerBookingProduct = await crmTestClient.retrieveBookingProduct(trainerBookerBooking.bookingProductId);
      expect(retrievedTrainerBookerBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Unassigned); // No change
      const trainerBookerBookingsCsvString = await retrieveCsvString(azureBlobContainerClient, 'trainerBookerBookingProducts');
      const trainerBookerBookingsRows = parseCsv(trainerBookerBookingsCsvString);
      expect(trainerBookerBookingsRows).toContainEqual(expect.objectContaining({
        bookingProductReference: retrievedTrainerBookerBookingProduct.ftts_reference,
      }));
    });
  });

  describe('bookings with no missing data', () => {
    beforeEach(async () => {
      licenceNumber = uuidv4();
      candidateAndLicence = await crmTestClient.createNewCandidate(licenceNumber, { ftts_persontype: CRMPersonType.Candidate });
      await deleteAllBlobs(azureBlobContainerClient);
    });

    test('candidate sa bookings are cancelled', async () => {
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      const startDateTime = new Date();
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      expect(retrievedBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Cancelled);
      expect(dayjs(startDateTime).isSame(retrievedBooking.ftts_owedcompbookingassigned, 'date')).toBe(true);
      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('candidate sa csc bookings are cancelled', async () => {
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CustomerServiceCentre, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      const startDateTime = new Date();
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      expect(retrievedBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Cancelled);
      expect(dayjs(startDateTime).isSame(retrievedBooking.ftts_owedcompbookingassigned, 'date')).toBe(true);
      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('trainer booker bookings with unassigned status are cancelled', async () => {
      const booking = await crmTestClient.createNewTrainerBookerBooking(candidateAndLicence, CRMBookingStatus.Unassigned, CRMProductNumber.CAR,
        {
          ftts_bookingstatus: CRMBookingStatus.Confirmed,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildTrainerBookerBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('trainer booker bookings with confirmed (assigned) status are cancelled', async () => {
      const booking = await crmTestClient.createNewTrainerBookerBooking(candidateAndLicence, CRMBookingStatus.Confirmed, CRMProductNumber.CAR,
        {
          ftts_bookingstatus: CRMBookingStatus.Confirmed,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildTrainerBookerBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('candidate nsa bookings are stored to the csv', async () => {
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
          ftts_nonstandardaccommodation: true,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      const csvString = await retrieveCsvString(azureBlobContainerClient, 'candidateAndCSCBookerBookingProducts');
      const rows = parseCsv(csvString);
      expect(rows).toContainEqual(expect.objectContaining({
        bookingReference: retrievedBooking.ftts_reference,
      }));
    });

    test('candidate nsa bookings are cancelled', async () => {
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
          ftts_nonstandardaccommodation: true,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('candidate nsa csc bookings are cancelled', async () => {
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CustomerServiceCentre, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
          ftts_nonstandardaccommodation: true,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('zero cost bookings are cancelled', async () => {
      const booking = await crmTestClient.createNewBooking(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.ADIP1DVA,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
          ftts_pricepaid: 0,
          ftts_zerocostbooking: true,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
          ftts_price: 0,
          ftts_salesreference: null as any,

        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      const startDateTime = new Date();
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      expect(retrievedBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Cancelled);
      expect(dayjs(startDateTime).isSame(retrievedBooking.ftts_owedcompbookingassigned, 'date')).toBe(true);
      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });
  });

  describe('bookings with missing candidate data', () => {
    beforeEach(async () => {
      await deleteAllBlobs(azureBlobContainerClient);
    });
    test('candidate sa no email booking is stored to csv', async () => {
      licenceNumber = uuidv4();
      candidateAndLicence = await crmTestClient.createNewCandidate(licenceNumber, {
        emailaddress1: null as any,
        ftts_persontype: CRMPersonType.Candidate,
      });
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      const csvString = await retrieveCsvString(azureBlobContainerClient, 'candidateAndCSCBookerBookingProducts');
      const rows = parseCsv(csvString);
      expect(rows).toContainEqual(expect.objectContaining({
        bookingReference: retrievedBooking.ftts_reference,
      }));
    });

    test('candidate sa with no email but has an address booking is cancelled', async () => {
      licenceNumber = uuidv4();
      candidateAndLicence = await crmTestClient.createNewCandidate(licenceNumber, {
        emailaddress1: null as any,
        address1_line1: '1 Test Road',
        address1_city: 'Test City',
        address1_postalcode: 'A1 1AA',
        ftts_persontype: CRMPersonType.Candidate,
      });
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      const startDateTime = new Date();
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      expect(retrievedBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Cancelled);
      expect(dayjs(startDateTime).isSame(retrievedBooking.ftts_owedcompbookingassigned, 'date')).toBe(true);
      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });

    test('candidate sa with no email and no address booking is cancelled', async () => {
      licenceNumber = uuidv4();
      candidateAndLicence = await crmTestClient.createNewCandidate(licenceNumber, {
        emailaddress1: null as any,
        address1_line1: null as any,
        address1_city: null as any,
        address1_postalcode: null as any,
        ftts_persontype: CRMPersonType.Candidate,
      });
      const booking = await crmTestClient.createNewBookingWithPayment(candidateAndLicence, CRMBookingStatus.Confirmed, CRMOrigin.CitizenPortal, CRMProductNumber.CAR,
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_testcentre@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        },
        {
          ftts_testdate: `${futureTestDate}T14:07:00Z`,
          'ftts_ihttcid@odata.bind': `/accounts(${INT_TEST_CENTRE_ID})`,
        });
      const jobDescriptor = buildCandidateBookingsJobDescriptor(futureTestDate);
      await uploadJobFile(azureBlobContainerClient, mockJobName, jobDescriptor);

      const startDateTime = new Date();
      await runFunction();
      await waitUntilJobIsDone(hasJobFileBeenDeleted(azureBlobContainerClient, mockJobName), MAX_TRIES, TIMEOUT);

      const retrievedBooking = await crmTestClient.retrieveBooking(booking.bookingId);
      expect(retrievedBooking.ftts_bookingstatus).toBe(CRMBookingStatus.Cancelled);
      expect(dayjs(startDateTime).isSame(retrievedBooking.ftts_owedcompbookingassigned, 'date')).toBe(true);
      const retrievedBookingProduct = await crmTestClient.retrieveBookingProduct(booking.bookingProductId);
      expect(retrievedBookingProduct.ftts_bookingstatus).toStrictEqual(CRMBookingStatus.Cancelled);
      expect(retrievedBookingProduct.ftts_canceldate).toBeDefined();
      expect(retrievedBookingProduct.ftts_cancelreason).toEqual(CRMCancelReason.TEST_CENTRE_CANCELLED);
    });
  });
});
