import MockDate from 'mockdate';
import { mocked } from 'ts-jest/utils';
import { sendCandidateBookingCancellationNotification } from '../../../../src/booking-compensation-processor/candidate/send-candidate-booking-cancellation-notification';
import { CrmClient } from '../../../../src/services/crm/crm-client';
import { JobDescriptor } from '../../../../src/types';
import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { EmailContent, LetterAddress, LetterContent } from '../../../../src/services/notification/types';
import { Target } from '../../../../src/services/notification/types/enums';
import { buildMockCandidateBookings } from '../../../stubs/candidate-booking.mock';
import { buildMockJobDescriptor } from '../../../stubs/job-descriptor.mock';
import { BusinessTelemetryEvents, logger } from '../../../../src/libraries/logger';
import mockedLogger from '../../../stubs/logger.mock';
import { config } from '../../../../src/config';
import { BookingCategory, Channel } from '../../../../src/services/crm/types/enums';

jest.mock('../../../../src/config');
const mockedConfig = mocked(config);

jest.mock('../../../../src/services/crm/crm-client');
const mockedCrmClient = mocked(new CrmClient());

jest.mock('../../../../src/services/notification/notification-client');
const mockedNotificationsGateway = mocked(new NotificationsClient());

const mockLetterContent: LetterContent = { body: 'Your test is cancelled Letter' };
const mockEmailContent: EmailContent = { subject: 'Test Cancelled Email', body: 'Your test is cancelled Email' };
jest.mock('../../../../src/services/notification/content/builders', () => ({
  buildCandidateBookingCancellationLetterContent: () => mockLetterContent,
  buildCandidateBookingCancellationEmailContent: () => mockEmailContent,
}));

describe('sendCandidateBookingCancellationNotification', () => {
  const mockNow = '2021-06-21T16:15:00.000Z';
  let jobDescriptor: JobDescriptor;

  beforeEach(() => {
    mockedCrmClient.getBookingsByOrigin.mockResolvedValue([]);
    MockDate.set(mockNow);
    jobDescriptor = buildMockJobDescriptor();
  });

  afterEach(() => {
    MockDate.reset();
    jest.resetAllMocks();
  });

  describe('Send Cancellation notification using feature toggle', () => {
    beforeAll(() => {
      mockedConfig.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForCandidate = true;
    });

    afterAll(() => {
      mockedConfig.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForCandidate = false;
    });

    test('calls notification for send email', async () => {
      const mockBooking = buildMockCandidateBookings(1)[0];

      await sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBooking);

      expect(mockedNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        mockBooking,
        Target.GB,
        BookingCategory.STANDARD_CANDIDATE_BOOKING_CANCELLATION,
      );

      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
        'sendCandidateBookingCancellationNotification: Sending notification success',
        expect.objectContaining({
          channel: Channel.email,
        }),
      );
    });

    test('calls notification for send letter', async () => {
      const mockBooking = buildMockCandidateBookings(1)[0];
      mockBooking.candidateEmail = '';
      await sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBooking);

      expect(mockedNotificationsGateway.sendNotification).toHaveBeenCalledWith(
        mockBooking,
        Target.GB,
        BookingCategory.STANDARD_CANDIDATE_BOOKING_CANCELLATION,
      );

      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
        'sendCandidateBookingCancellationNotification: Sending notification success',
        expect.objectContaining({
          channel: Channel.letter,
        }),
      );
    });

    test('calls notification throws error, swallows and rethrows', async () => {
      const error = new Error('MockBookingError');
      const mockBooking = buildMockCandidateBookings(1)[0];

      mockedNotificationsGateway.sendNotification = jest.fn().mockImplementation(async () => Promise.reject(error));
      await expect(sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBooking))
        .rejects
        .toStrictEqual(error);

      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
        'sendCandidateBookingCancellationNotification: Sending notification failed',
        expect.objectContaining({
          channel: Channel.email,
        }),
      );
    });
  });

  test('writes and sends an email to candidate - if booking has email address', async () => {
    const mockBookings = buildMockCandidateBookings(3);
    const mockEmailAddress = 'test@test.com';
    const reference = mockBookings[0].bookingReference;
    const target = Target.GB;

    mockBookings[0].candidateEmail = mockEmailAddress;

    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);

    await sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBookings[0]);

    expect(mockedNotificationsGateway.sendEmail).toHaveBeenCalledWith(mockEmailAddress, mockEmailContent, reference, target);
    expect(logger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
      'sendCandidateBookingCancellationNotification: Sending email success',
      expect.objectContaining({
        channel: Channel.email,
      }),
    );
    expect(mockedNotificationsGateway.sendNotification).not.toHaveBeenCalled();
  });

  test('logs an event if fails to write and send an email to candidate - if booking has email address', async () => {
    const mockBookings = buildMockCandidateBookings(3);
    const mockEmailAddress = 'test@test.com';

    mockBookings[0].candidateEmail = mockEmailAddress;

    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
    const error = new Error('error');
    mockedNotificationsGateway.sendEmail.mockRejectedValue(error);

    await expect(sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBookings[0]))
      .rejects
      .toStrictEqual(error);

    expect(logger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
      'sendCandidateBookingCancellationNotification: Sending email failed',
      expect.objectContaining({
        channel: Channel.email,
      }),
    );
    expect(mockedNotificationsGateway.sendNotification).not.toHaveBeenCalled();
  });

  test('writes and sends a letter to candidate - if no email address but valid postal address', async () => {
    const mockBookings = buildMockCandidateBookings(3);
    const address: LetterAddress = {
      name: `${mockBookings[0].candidateFirstnames} ${mockBookings[0].candidateSurname}`,
      address_line_1: mockBookings[0].candidateAddressLine1 as string,
      address_line_2: mockBookings[0].candidateAddressCity as string,
      postcode: mockBookings[0].candidateAddressPostcode as string,
    };
    const reference = mockBookings[0].bookingReference;
    const target = Target.GB;

    mockBookings[0].candidateEmail = undefined;

    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);

    await sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBookings[0]);

    expect(mockedNotificationsGateway.sendLetter).toHaveBeenCalledWith(address, mockLetterContent, reference, target);
    expect(mockedNotificationsGateway.sendNotification).not.toHaveBeenCalled();
  });

  test('log an event if fails to write and send a letter to candidate - if no email address but valid postal address', async () => {
    const mockBookings = buildMockCandidateBookings(3);
    const address: LetterAddress = {
      name: `${mockBookings[0].candidateFirstnames} ${mockBookings[0].candidateSurname}`,
      address_line_1: mockBookings[0].candidateAddressLine1 as string,
      address_line_2: mockBookings[0].candidateAddressCity as string,
      postcode: mockBookings[0].candidateAddressPostcode as string,
    };
    const reference = mockBookings[0].bookingReference;
    const target = Target.GB;

    mockBookings[0].candidateEmail = undefined;

    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);
    const error = new Error('error');
    mockedNotificationsGateway.sendLetter.mockRejectedValue(error);

    await expect(sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBookings[0]))
      .rejects
      .toThrow(error);

    expect(mockedNotificationsGateway.sendLetter).toHaveBeenCalledWith(address, mockLetterContent, reference, target);
    expect(logger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
      'sendCandidateBookingCancellationNotification: Sending letter failed',
      expect.objectContaining({
        channel: Channel.letter,
      }),
    );
    expect(mockedNotificationsGateway.sendNotification).not.toHaveBeenCalled();
  });

  test('logs notification not possible event - if no email address and no valid postal address', async () => {
    const mockBookings = buildMockCandidateBookings(3);
    mockBookings[0].candidateEmail = undefined;
    mockBookings[0].candidateAddressLine1 = '';

    mockedCrmClient.getBookingsByOrigin.mockResolvedValue(mockBookings);

    await expect(sendCandidateBookingCancellationNotification(jobDescriptor, mockedNotificationsGateway, mockBookings[0]))
      .rejects.toEqual(Error('sendCandidateBookingCancellationNotification: Not possible to send email or letter - no valid email or postal address'));

    expect(mockedLogger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_NOT_POSSIBLE,
      expect.stringContaining('No valid email or postal address'),
      expect.objectContaining({
        bookingProductId: mockBookings[0].bookingProductId,
      }),
    );
    expect(mockedNotificationsGateway.sendNotification).not.toHaveBeenCalled();
  });
});
