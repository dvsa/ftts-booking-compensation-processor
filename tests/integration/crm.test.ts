import { CRMTestClient, constants } from '@dvsa/ftts-crm-test-client';
import { CRMBookingStatus, CRMOrigin, CRMPersonType } from '@dvsa/ftts-crm-test-client/dist/enums';
import { Candidate } from '@dvsa/ftts-crm-test-client/dist/types';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { CrmClient } from '../../src/services/crm/crm-client';
import { CandidateBooking, TrainerBookerBooking } from '../../src/services/crm/types/bookings';
import { OriginType } from '../../src/services/crm/types/enums';

jest.mock('@dvsa/azure-logger');
jest.setTimeout(120000);

describe('CRM integration tests', () => {
  const crmTestClient = new CRMTestClient();
  const crmClient = new CrmClient();
  const derbyTestCentreId = constants.account.dvsa.derby;
  let beforeDate: string;
  let afterDate: string;
  let mockCandidate: Candidate;

  beforeAll(async () => {
    beforeDate = dayjs(constants.testDate).subtract(1, 'hour').toISOString();
    afterDate = dayjs(constants.testDate).add(1, 'hour').toISOString();

    // Doing this to wake up CRM to prevent timeout on the first test case
    await crmClient.getBookingsByOrigin<CandidateBooking>(
      OriginType.CANDIDATE,
      '2022-03-16T02:00:00.000Z',
      '2022-03-16T02:00:00.000Z',
      [derbyTestCentreId],
    );
  });

  beforeEach(async () => {
    const mockLicenceNumber = uuidv4();
    mockCandidate = await crmTestClient.createNewCandidate(mockLicenceNumber, { ftts_persontype: CRMPersonType.Candidate });
  });

  describe('getBookingsByOrigin', () => {
    test('get candidate bookings', async () => {
      const mockBooking = await crmTestClient.createNewBooking(mockCandidate);

      const response = await crmClient.getBookingsByOrigin<CandidateBooking>(
        OriginType.CANDIDATE,
        beforeDate,
        afterDate,
        [derbyTestCentreId],
      );

      expect(response).toStrictEqual(expect.arrayContaining([
        expect.objectContaining({
          bookingId: mockBooking.bookingId,
          bookingProductId: mockBooking.bookingProductId,
        }),
      ]));
    });

    test('get candidate bookings - does not retrieve bookings with completed status', async () => {
      const mockBooking = await crmTestClient.createNewBooking(mockCandidate, CRMBookingStatus.CompletePassed);
      const mockBookingFailed = await crmTestClient.createNewBooking(mockCandidate, CRMBookingStatus.CompleteFailed);

      const response = await crmClient.getBookingsByOrigin<CandidateBooking>(
        OriginType.CANDIDATE,
        beforeDate,
        afterDate,
        [derbyTestCentreId],
      );

      expect(response).not.toStrictEqual(expect.arrayContaining([
        expect.objectContaining({
          bookingId: mockBooking.bookingId,
          bookingProductId: mockBooking.bookingProductId,
        }),
      ]));
      expect(response).not.toStrictEqual(expect.arrayContaining([
        expect.objectContaining({
          bookingId: mockBookingFailed.bookingId,
          bookingProductId: mockBookingFailed.bookingProductId,
        }),
      ]));
    });

    test('get trainer booker bookings', async () => {
      const mockBooking = await crmTestClient.createNewBooking(mockCandidate, CRMBookingStatus.Unassigned, CRMOrigin.TrainerBookerPortal);

      const response = await crmClient.getBookingsByOrigin<TrainerBookerBooking>(
        OriginType.TRAINER_BOOKER,
        beforeDate,
        afterDate,
        [derbyTestCentreId],
      );

      expect(response).toStrictEqual(expect.arrayContaining([
        expect.objectContaining({
          bookingId: mockBooking.bookingId,
          bookingProductId: mockBooking.bookingProductId,
        }),
      ]));
    });

    test('get trainer booker bookings - does not get complete passed/failed bookings', async () => {
      const mockBooking = await crmTestClient.createNewBooking(mockCandidate, CRMBookingStatus.CompletePassed, CRMOrigin.TrainerBookerPortal);

      const response = await crmClient.getBookingsByOrigin<TrainerBookerBooking>(
        OriginType.TRAINER_BOOKER,
        beforeDate,
        afterDate,
        [derbyTestCentreId],
      );

      expect(response).not.toStrictEqual(expect.arrayContaining([
        expect.objectContaining({
          bookingId: mockBooking.bookingId,
          bookingProductId: mockBooking.bookingProductId,
        }),
      ]));
    });
  });
});
