import { config } from '../../config';
import axiosRetryClient from '../../libraries/axios-retry-client';
import { logger } from '../../libraries/logger';
import { getBookingIdentifiers } from '../../utils/identifiers';
import { ManagedIdentityAuth } from '../auth/managed-identity-auth';
import { CandidateBooking } from '../crm/types/bookings';
import { TcnRegion } from './enums';

export class SchedulingClient {
  constructor(private auth: ManagedIdentityAuth = new ManagedIdentityAuth(config.scheduling.identity)) { }

  public async deleteBooking(booking: CandidateBooking): Promise<void> {
    try {
      const { bookingProductReference } = booking;

      const authHeader = await this.auth.getAuthHeader();
      const testCentreRegion = this.calaculateTestCentreRegion(booking);
      const requestUrl = `${config.scheduling.baseUrl}/v1/tcn/${testCentreRegion}/bookings/${bookingProductReference}`;
      logger.debug('SchedulingClient::deleteBooking: Attempting to delete booking in TCN', {
        requestUrl,
        bookingProductReference,
        testCentreRegion,
      });
      await axiosRetryClient.delete(requestUrl, authHeader);
      logger.debug('SchedulingClient::deleteBooking: Successfully deleted booking in TCN', {
        bookingProductReference,
      });
    } catch (error) {
      logger.error(error, 'SchedulingClient::deleteBooking: Deleting booking in TCN failed', {
        ...getBookingIdentifiers(booking),
      });
      throw error;
    }
  }

  private calaculateTestCentreRegion(booking: CandidateBooking): string {
    if (booking.isTcnRegionA) {
      return TcnRegion.A;
    }
    if (booking.isTcnRegionB) {
      return TcnRegion.B;
    }
    if (booking.isTcnRegionC) {
      return TcnRegion.C;
    }
    throw new Error('SchedulingClient::calaculateTestCentreRegion: No TCN Region set on test centre');
  }
}
