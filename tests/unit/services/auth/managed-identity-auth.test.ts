import { ChainedTokenCredential } from '@azure/identity';
import { ManagedIdentityAuth } from '../../../../src/services/auth/managed-identity-auth';
import { ManagedIdentityAuthConfig } from '../../../../src/services/auth/types';

jest.mock('@azure/identity');

describe('ManagedIdentityAuth', () => {
  let managedIdentityAuth: ManagedIdentityAuth;

  const mockTokenCredential = {
    getToken: jest.fn(),
  };

  beforeEach(() => {
    managedIdentityAuth = new ManagedIdentityAuth(
      {} as ManagedIdentityAuthConfig,
      mockTokenCredential as unknown as ChainedTokenCredential,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('gets the auth header', async () => {
    mockTokenCredential.getToken.mockImplementationOnce(() => ({ token: Promise.resolve('mockTestToken') }));

    const authHeader = await managedIdentityAuth.getAuthHeader();

    expect(authHeader).toStrictEqual({
      headers: {
        Authorization: 'Bearer mockTestToken',
      },
    });
    expect(mockTokenCredential.getToken).toHaveBeenCalled();
  });

  test('gets the token', async () => {
    mockTokenCredential.getToken.mockImplementationOnce(() => ({ token: Promise.resolve('mockTestToken') }));

    const token = await managedIdentityAuth.getToken();

    expect(token).toStrictEqual('mockTestToken');
    expect(mockTokenCredential.getToken).toHaveBeenCalled();
  });

  test('throws an error if unable to get token', async () => {
    mockTokenCredential.getToken.mockRejectedValue('Unknown error');

    await expect(managedIdentityAuth.getAuthHeader()).rejects.toBe('Unknown error');
    expect(mockTokenCredential.getToken).toHaveBeenCalled();
  });
});
