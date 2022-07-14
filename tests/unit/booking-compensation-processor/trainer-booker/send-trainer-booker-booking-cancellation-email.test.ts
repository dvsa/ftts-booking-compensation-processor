import { mock } from 'jest-mock-extended';
import { sendTrainerBookerBookingCancellationEmail } from '../../../../src/booking-compensation-processor/trainer-booker/send-trainer-booker-booking-cancellation-email';
import { NotificationsClient } from '../../../../src/services/notification/notification-client';
import { buildMockTrainerBookerBookings } from '../../../stubs/trainer-booker-booking.mock';
import { logger, BusinessTelemetryEvents } from '../../../../src/libraries/logger';
import { Target } from '../../../../src/services/notification/types/enums';
import { JobDescriptor } from '../../../../src/types';
import { buildMockJobDescriptor } from '../../../stubs/job-descriptor.mock';

jest.mock('../../../../src/libraries/logger');

jest.mock('../../../../src/services/notification/notification-client');
const mockedNotificationsClient = mock<NotificationsClient>();

describe('sendTrainerBookerBookingCancellationEmail', () => {
  let mockedJobDescriptor: JobDescriptor;

  beforeEach(() => {
    mockedJobDescriptor = buildMockJobDescriptor();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
        type: 'Email',
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
        type: 'Email',
      },
    );
  });
});
