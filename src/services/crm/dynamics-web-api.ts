import { proxifyWithRetryPolicy } from '@dvsa/cds-retry';
import DynamicsWebApi from 'dynamics-web-api';

import { config } from '../../config';
import { logger } from '../../libraries/logger';
import { ManagedIdentityAuth } from '../auth/managed-identity-auth';

export const onTokenRefresh = async (callback: (token: string) => void): Promise<void> => {
  try {
    const managedIdentityAuth = new ManagedIdentityAuth(config.crm.identity);
    const token = await managedIdentityAuth.getToken();
    callback(token || '');
  } catch (error) {
    logger.error(error, `Failed to authenticate with CRM - ${(error as Error).message}`);
    // Callback needs to be called - to prevent function from hanging
    callback('');
  }
};

export const newDynamicsWebApi = (): DynamicsWebApi => {
  const dynamicsWebApi = new DynamicsWebApi({
    webApiUrl: `${config.crm.apiUrl}/`,
    onTokenRefresh,
  });
  proxifyWithRetryPolicy(
    dynamicsWebApi,
    (message: string, properties?: Record<string, unknown>) => logger.warn(message, properties),
    { retries: Number(config.crm.maxRetries) },
  );
  return dynamicsWebApi;
};
