import {
  ChainedTokenCredential, ClientSecretCredential, ManagedIdentityCredential, TokenCredential,
} from '@dvsa/ftts-auth-client';
import { logger } from '../../libraries/logger';
import { AuthHeader, ManagedIdentityAuthConfig } from './types';

export class ManagedIdentityAuth {
  private tokenCredential: ChainedTokenCredential;

  constructor(
    private config: ManagedIdentityAuthConfig,
  ) {
    const sources: TokenCredential[] = [new ManagedIdentityCredential(config.userAssignedEntityClientId)];
    if (config.azureTenantId && config.azureClientId && config.azureClientSecret) {
      sources.push(new ClientSecretCredential(config.azureTenantId, config.azureClientId, config.azureClientSecret));
    }
    this.tokenCredential = new ChainedTokenCredential(...sources);
  }

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
