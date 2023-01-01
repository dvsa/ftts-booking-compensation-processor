import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { logger } from '../../../../src/libraries/logger';
import axiosRetryClient from '../../../../src/libraries/axios-retry-client';
import { ManagedIdentityAuth } from '../../../../src/services/auth/managed-identity-auth';
import { EmailContent, LetterContent, LetterAddress } from '../../../../src/services/notification/types';
import { Target } from '../../../../src/services/notification/types/enums';
import { BookingCategory, Channel, GovernmentAgency } from '../../../../src/services/crm/types/enums';
import { CandidateBooking } from '../../../../src/services/crm/types/bookings';

jest.mock('../../../../src/libraries/axios-retry-client');
const mockedAxios = axiosRetryClient as jest.Mocked<typeof axiosRetryClient>;

describe('Notifications API gateway', () => {
  let notifications: NotificationsClient;

  const mockNotificationsUrl = 'notifications.com/notification';
  const mockContextId = 'BOOKING-COMPENSATION-PROCESSOR';
  const mockBookingRef = '12345';
  const mockBookingProductId = '2344d4d6-fb70-4fe9-8a0f-154f8935f9d3';
  const mockBookingId = '2ec724c9-4db6-4559-8d1b-fcdaccea8bb6';
  const mockAccessToken = { value: '1234-5678' };
  const mockEmailAddress = 'mock@email.com';
  const mockEmailContent: EmailContent = {
    subject: 'mockSubject',
    body: 'mockBody',
  };
  const mockLetterContent: LetterContent = {
    body: 'mockLetterBody',
  };
  const mockLetterAddress: LetterAddress = {
    name: 'Mock Name',
    address_line_1: 'mockAddressLine1',
    address_line_2: 'mockAddressLine2',
    postcode: 'mockPostcode',
  };

  const mockTarget = Target.GB;

  beforeEach(() => {
    const mockAuthClient = {
      getAuthHeader: () => ({
        headers: {
          Authorization: `Bearer ${mockAccessToken.value}`,
        },
      }),
    };

    notifications = new NotificationsClient(
      mockAuthClient as unknown as ManagedIdentityAuth,
      mockNotificationsUrl,
      mockContextId,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendEmail', () => {
    test('should send a request with correct email payload and auth headers set', async () => {
      await notifications.sendEmail(mockEmailAddress, mockEmailContent, mockBookingRef, mockTarget);

      const expectedUrl = `${mockNotificationsUrl}/email`;
      const expectedPayload = {
        email_address: mockEmailAddress,
        reference: mockBookingRef,
        target: mockTarget,
        message_subject: mockEmailContent.subject,
        message_content: mockEmailContent.body,
        context_id: mockContextId,
      };
      const expectedConfig = { headers: { Authorization: `Bearer ${mockAccessToken.value}` } };
      expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedConfig);
    });

    test('should log and rethrow if request fails', async () => {
      mockedAxios.post.mockImplementationOnce(() => {
        throw Error('ntf error');
      });

      await expect(notifications.sendEmail('mock@email.com', mockEmailContent, mockBookingRef, Target.GB)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        Error('ntf error'),
        'NotificationsGateway::sendRequest: Post failed',
        {
          error: Error('ntf error'),
          endpoint: '/email',
        },
      );
      expect(logger.error).toHaveBeenCalledWith(Error('ntf error'), 'NotificationsClient::sendEmail: Notification API send email request failed');
    });
  });

  describe('sendLetter', () => {
    test('should send a request with correct letter payload and auth headers set', async () => {
      await notifications.sendLetter(mockLetterAddress, mockLetterContent, mockBookingRef, mockTarget);

      const expectedUrl = `${mockNotificationsUrl}letter`;
      const expectedPayload = {
        name: mockLetterAddress.name,
        address_line_1: mockLetterAddress.address_line_1,
        address_line_2: mockLetterAddress.address_line_2,
        postcode: mockLetterAddress.postcode,
        reference: mockBookingRef,
        target: mockTarget,
        message_content: mockLetterContent.body,
        context_id: mockContextId,
      };
      const expectedConfig = { headers: { Authorization: `Bearer ${mockAccessToken.value}` } };
      expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedConfig);
    });

    test('should log and rethrow if request fails', async () => {
      mockedAxios.post.mockImplementationOnce(() => {
        throw Error('ntf error');
      });

      await expect(notifications.sendLetter(mockLetterAddress, mockEmailContent, mockBookingRef, Target.GB)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        Error('ntf error'),
        'NotificationsGateway::sendRequest: Post failed',
        {
          error: Error('ntf error'),
          endpoint: 'letter',
        },
      );
      expect(logger.error).toHaveBeenCalledWith(Error('ntf error'), 'NotificationsClient::sendLetter: Notification API send letter request failed');
    });
  });

  describe('sendNotification', () => {
    test('should send a request with correct letter payload and auth headers set', async () => {
      // await notifications.sendNotification(
      //   mockBookingProductId,
      //   mockBookingId,
      //   Channel.email,
      //   Target.GB,
      //   BookingCategory.STANDARD_BOOKING_CANCELLATION,
      //   mockEmailAddress,
      //   mockLetterAddress,
      //   mockBookingRef,
      // );
      await notifications.sendNotification(
        {
          bookingProductId: mockBookingProductId,
          bookingId: mockBookingId,
          bookingReference: mockBookingRef,
          candidateEmail: mockEmailAddress,
          candidateFirstnames: 'Mock',
          candidateSurname: 'Name',
          candidateAddressLine1: mockLetterAddress.address_line_1,
          candidateAddressLine2: mockLetterAddress.address_line_2,
          candidateAddressPostcode: mockLetterAddress.postcode,

        } as CandidateBooking,
        Target.GB,
        BookingCategory.STANDARD_BOOKING_CANCELLATION,
      );

      const expectedUrl = `${mockNotificationsUrl}/send-notification`;
      const expectedPayload = {
        channel: Channel.email,
        agency: GovernmentAgency.DVSA,
        language: 'English',
        category: BookingCategory.STANDARD_BOOKING_CANCELLATION,
        email_address: mockEmailAddress,
        postal_address: mockLetterAddress,
        reference: mockBookingRef,
        bookingProductId: mockBookingProductId,
        bookingId: mockBookingId,
      };
      const expectedConfig = { headers: { Authorization: `Bearer ${mockAccessToken.value}` } };
      expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedConfig);
    });

    test('should log and rethrow if request fails', async () => {
      mockedAxios.post.mockImplementationOnce(() => {
        throw Error('ntf error');
      });

      await expect(notifications.sendNotification(
        mockBookingProductId,
        mockBookingId,
        Channel.email,
        Target.GB,
        BookingCategory.STANDARD_BOOKING_CANCELLATION,
        mockEmailAddress,
        mockLetterAddress,
        mockBookingRef,
      )).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        Error('ntf error'),
        'NotificationsGateway::sendRequest: Post failed',
        {
          error: Error('ntf error'),
          endpoint: '/send-notification',
        },
      );
      expect(logger.error).toHaveBeenCalledWith(Error('ntf error'), 'NotificationsClient::sendNotification: Notification API send Notification request failed');
    });
  });
});
