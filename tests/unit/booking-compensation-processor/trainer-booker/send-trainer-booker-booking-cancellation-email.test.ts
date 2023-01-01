import { mocked } from 'ts-jest/utils';
import { sendTrainerBookerBookingCancellationEmail } from '../../../../src/booking-compensation-processor/trainer-booker/send-trainer-booker-booking-cancellation-email';
import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';
import { logger, BusinessTelemetryEvents } from '../../../../src/libraries/logger';
import { Target } from '../../../../src/services/notification/types/enums';
import { JobDescriptor } from '../../../../src/types';
import { buildMockJobDescriptor } from '../../../stubs/job-descriptor.mock';
import { config } from '../../../../src/config';
import { BookingCategory, Channel } from '../../../../src/services/crm/types/enums';

jest.mock('../../../../src/config');
const mockedConfig = mocked(config);

jest.mock('../../../../src/libraries/logger');

jest.mock('../../../../src/services/notification/notification-client');
const mockedNotificationsClient = mocked(new NotificationsClient());

describe('sendTrainerBookerBookingCancellationEmail', () => {
  let mockedJobDescriptor: JobDescriptor;

  beforeEach(() => {
    mockedJobDescriptor = buildMockJobDescriptor();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Send Cancellation notification using feature toggle', () => {
    beforeAll(() => {
      mockedConfig.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForTrainer = true;
    });

    afterAll(() => {
      mockedConfig.featureToggle.enableSendBookingCancellationUsingSendNotificationEndpointForTrainer = false;
    });

    test('calls notification for send email', async () => {
      const mockOrganisationId = 'org1-id';
      const mockEmail = 'org1@test.com';
      const mockBookings = buildMockTrainerBookerBookings(3, {
        organisationId: mockOrganisationId,
        organisationEmail: mockEmail,
      });

      await sendTrainerBookerBookingCancellationEmail(
        mockOrganisationId,
        mockBookings,
        mockedJobDescriptor,
        mockedNotificationsClient,
      );

      expect(mockedNotificationsClient.sendNotification).toHaveBeenCalledWith(
        mockBookings[0],
        Target.GB,
        BookingCategory.STANDARD_TRAINER_BOOKER_BOOKING_CANCELLATION,
        mockEmail,
      );
      expect(logger.event).toHaveBeenCalledWith(
        BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
        'BookingCompensationProcessor::sendTrainerBookerBookingCancellationNotification: Sending notification success',
        {
          organisationId: mockOrganisationId,
          channel: Channel.email,
          bookingId: mockBookings[0].bookingId,
          bookingProductId: mockBookings[0].bookingProductId,
          bookingProductReference: mockBookings[0].bookingProductReference,
          bookingReference: mockBookings[0].bookingReference,
        },
      );
    });

    test('calls notification throws error, swallows and rethrows', async () => {
      const error = new Error('MockBookingError');
      const mockOrganisationId = 'org1-id';
      const mockEmail = 'org1@test.com';
      const mockBookings = buildMockTrainerBookerBookings(3, {
        organisationId: mockOrganisationId,
        organisationEmail: mockEmail,
      });

      mockedNotificationsClient.sendNotification = jest.fn().mockImplementation(async () => Promise.reject(error));
      await expect(sendTrainerBookerBookingCancellationEmail(
        mockOrganisationId,
        mockBookings,
        mockedJobDescriptor,
        mockedNotificationsClient,
      )).rejects.toThrow(error);
    });
  });

  test('GIVEN a trainer booker with their bookings WHEN called THEN trainer booker receives an email', async () => {
    const mockOrganisationId = 'org1-id';
    const mockEmail = 'org1@test.com';
    const mockBookings = buildMockTrainerBookerBookings(3, {
      organisationId: mockOrganisationId,
      organisationEmail: mockEmail,
    });

    await sendTrainerBookerBookingCancellationEmail(
      mockOrganisationId,
      mockBookings,
      mockedJobDescriptor,
      mockedNotificationsClient,
    );

    expect(mockedNotificationsClient.sendEmail).toHaveBeenCalledWith(
      mockEmail,
      expect.objectContaining({
        subject: 'DVSA: Driving theory tests CANCELLED',
      }),
      mockOrganisationId,
      Target.GB,
    );
    expect(logger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_SUCCEEDED,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email success',
      {
        organisationId: mockOrganisationId,
        channel: Channel.email,
        bookingId: mockBookings[0].bookingId,
        bookingProductId: mockBookings[0].bookingProductId,
        bookingProductReference: mockBookings[0].bookingProductReference,
        bookingReference: mockBookings[0].bookingReference,
      },
    );
  });

  test('GIVEN sendEmail fails WHEN called THEN the error is logged and thrown', async () => {
    const mockOrganisationId = 'org1-id';
    const mockEmail = 'org1@test.com';
    const mockBookings = buildMockTrainerBookerBookings(3, {
      organisationId: mockOrganisationId,
      organisationEmail: mockEmail,
    });
    const error = new Error('msg');
    mockedNotificationsClient.sendEmail.mockRejectedValueOnce(error);

    await expect(sendTrainerBookerBookingCancellationEmail(
      mockOrganisationId,
      mockBookings,
      mockedJobDescriptor,
      mockedNotificationsClient,
    )).rejects.toStrictEqual(error);

    expect(mockedNotificationsClient.sendEmail).toHaveBeenCalled();
    expect(logger.event).toHaveBeenCalledWith(
      BusinessTelemetryEvents.BCP_BOOKING_PROCESSING_NOTIFICATION_FAILED,
      'BookingCompensationProcessor::sendTrainerBookerBookingCancellationEmail: Sending email failed',
      {
        organisationId: mockOrganisationId,
        channel: Channel.email,
        bookingId: mockBookings[0].bookingId,
        bookingProductId: mockBookings[0].bookingProductId,
        bookingProductReference: mockBookings[0].bookingProductReference,
        bookingReference: mockBookings[0].bookingReference,
      },
    );
  });
});
