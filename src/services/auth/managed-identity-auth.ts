import {
  ChainedTokenCredential, ClientSecretCredential, ManagedIdentityCredential,
} from '@azure/identity';
import { logger } from '../../libraries/logger';
import { AuthHeader, ManagedIdentityAuthConfig } from './types';

export class ManagedIdentityAuth {
  constructor(
    private config: ManagedIdentityAuthConfig,
    private tokenCredential: ChainedTokenCredential = new ChainedTokenCredential(
      new ManagedIdentityCredential(config.userAssignedEntityClientId),
      new ClientSecretCredential(config.azureTenantId, config.azureClientId, config.azureClientSecret),
    ),
  ) { }

  public async getAuthHeader(): Promise<AuthHeader> {
    const token = await this.getToken();
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  public async getToken(): Promise<string | undefined> {
    try {
      const activeToken = await this.tokenCredential.getToken(this.config.scope);
      return activeToken?.token;
    } catch (error) {
      logger.error(
        error,
        'ManagedIdentityAuth::getToken: Unable to retrieve token',
        {
          scope: this.config.scope,
          clientId: this.config.userAssignedEntityClientId,
        },
      );
      throw error;
    }
  }
}
