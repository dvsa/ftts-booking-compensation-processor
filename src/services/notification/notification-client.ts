import { config } from '../../config';
import { logger, BusinessTelemetryEvents, CustomAxiosError } from '../../libraries/logger';
import { ManagedIdentityAuth } from '../auth/managed-identity-auth';
import { AuthHeader } from '../auth/types';
import axiosRetryClient from '../../libraries/axios-retry-client';
import { EmailContent, LetterAddress, LetterContent } from './types';
import { Target } from './types/enums';

const EMAIL_ENDPOINT = '/email';
type EmailPayload = {
  email_address: string;
  message_subject: string;
  message_content: string;
  reference: string;
  target: Target;
  context_id: string;
};

const LETTER_ENDPOINT = 'letter';
type LetterPayload = {
  name: string,
  address_line_1: string,
  address_line_2: string,
  address_line_3?: string,
  address_line_4?: string,
  address_line_5?: string,
  address_line_6?: string,
  postcode: string,
  reference: string,
  target: Target,
  context_id: string,
  message_content: string,
};

export class NotificationsClient {
  constructor(
    private auth: ManagedIdentityAuth = new ManagedIdentityAuth(config.notification.identity),
    private apiUrl: string = config.notification.baseUrl,
    private contextId: string = config.websiteSiteName,
  ) { }

  public async sendEmail(emailAddress: string, content: EmailContent, reference: string, target: Target): Promise<void> {
    const { subject, body } = content;
    const payload: EmailPayload = {
      email_address: emailAddress,
      message_subject: subject,
      message_content: body,
      reference,
      target,
      context_id: this.contextId,
    };

    try {
      await this.sendRequest(EMAIL_ENDPOINT, payload);
    } catch (error) {
      const e: CustomAxiosError = error as CustomAxiosError;
      const errorMessage = 'NotificationsClient::sendEmail: Notification API send email request failed';
      logger.error(e as Error, errorMessage);
      this.logErrorEvent(e, reference, errorMessage);
      throw e as Error;
    }
  }

  public async sendLetter(address: LetterAddress, content: LetterContent, reference: string, target: Target): Promise<void> {
    const payload: LetterPayload = {
      ...address,
      reference,
      target,
      context_id: this.contextId,
      message_content: content.body,
    };
    try {
      await this.sendRequest(LETTER_ENDPOINT, payload);
    } catch (error) {
      const e: CustomAxiosError = error as CustomAxiosError;
      const errorMessage = 'NotificationsClient::sendLetter: Notification API send letter request failed';
      logger.error(e as Error, errorMessage);
      this.logErrorEvent(e, reference, errorMessage);
      throw e as Error;
    }
  }

  private async sendRequest(endpoint: string, payload: EmailPayload | LetterPayload): Promise<void> {
    const url = `${this.apiUrl}${endpoint}`;
    try {
      const header = await this.getToken();
      logger.debug('NotificationsClient::sendRequest: Raw request payload', {
        url,
        payload,
      });
      const response = await axiosRetryClient.post(url, payload, header);
      logger.debug('NotificationsClient::sendRequest: Raw response', {
        url,
        ...response,
      });
    } catch (error) {
      logger.error(error, 'NotificationsGateway::sendRequest: Post failed', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error,
        endpoint,
      });
      throw error;
    }
  }

  private async getToken(): Promise<AuthHeader> {
    try {
      return await this.auth.getAuthHeader();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      logger.event(BusinessTelemetryEvents.BCP_NOTIFICATION_AUTH_ISSUE, 'NotificationsClient::getToken: Token call failed', { error });
      throw error;
    }
  }

  private logErrorEvent(e: CustomAxiosError, reference: string, errorMessage: string): void {
    const errorPayload = {
      reference,
      error: e.toString(),
      status: e.response?.status || 0,
      // CustomAxiosError response.data is any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      response: e.response?.data,
    };
    switch (true) {
      case errorPayload.status === 401:
      case errorPayload.status === 403:
        logger.event(BusinessTelemetryEvents.BCP_NOTIFICATION_AUTH_ISSUE, errorMessage, errorPayload);
        break;
      case errorPayload.status >= 500 && errorPayload.status < 600:
        logger.event(BusinessTelemetryEvents.BCP_NOTIFICATION_ERROR, errorMessage, errorPayload);
        break;
      case errorPayload.status >= 400 && errorPayload.status < 500:
        logger.event(BusinessTelemetryEvents.BCP_NOTIFICATION_REQUEST_ISSUE, errorMessage, errorPayload);
        break;
      default:
        logger.warn('NotificationsClient::logErrorEvent: Notification API request failed', {
          errorMessage,
          errorPayload,
        });
    }
  }
}
