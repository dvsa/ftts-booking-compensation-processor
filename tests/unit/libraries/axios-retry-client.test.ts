// Using nock to intercept http calls with mock response
import nock from 'nock';
import MockDate from 'mockdate';

import axiosRetryClient from '../../../src/libraries/axios-retry-client';
import { config } from '../../../src/config';

jest.mock('../../../src/config', () => ({
  config: {
    http: {
      retryClient: {
        maxRetries: 3,
        defaultRetryDelay: 300,
        maxRetryAfter: 1000,
      },
    },
    websiteSiteName: 'abc',
  },
}));
jest.mock('../../../src/libraries/logger');

const { defaultRetryDelay } = config.http.retryClient;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const axiosSuccessResponse = expect.objectContaining({ status: 200 });
const axiosError = (status: number) => new Error(`Request failed with status code ${status}`);

describe('Axios retry client', () => {
  const mockUrl = 'https://mock-payment-api.com';
  const mockEndpoint = '/make-a-payment';

  let setTimeoutSpy;
  beforeEach(() => {
    // Override setTimeout so it doesn't actually perform delay in tests
    // But can capture delay value passed to it
    setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .mockImplementation((handler: TimerHandler) => typeof handler === 'function' && handler());

    MockDate.set('Fri, 4 Dec 2020 11:00:00 GMT'); // Mock Date.now()
  });

  afterEach(() => {
    MockDate.reset();
    nock.cleanAll();
    jest.resetAllMocks();
  });

  describe('given a 200 success response', () => {
    test('resolves the request', async () => {
      nock(mockUrl)
        .post(mockEndpoint)
        .reply(200);

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).resolves.toStrictEqual(axiosSuccessResponse);
    });
  });

  describe('given a non-retryable error response eg. 400 Bad Request', () => {
    test('throws the error without any retries', async () => {
      nock(mockUrl)
        .post(mockEndpoint)
        .reply(400);

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).rejects.toThrow(axiosError(400));
    });
  });

  describe('given a retryable 5xx error response', () => {
    test('retries up to max 3 times and then throws the error', async () => {
      const scope = nock(mockUrl)
        .post(mockEndpoint)
        .times(4) // Mock 4 calls, the first then 3 retries
        .reply(503);

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).rejects.toThrow(axiosError(503));
      expect(scope.isDone()).toBe(true); // True if all 4 calls were made
    });

    test('delays by the default amount between each retry', async () => {
      nock(mockUrl)
        .post(mockEndpoint)
        .times(4)
        .reply(503);

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).rejects.toThrow(axiosError(503));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(setTimeoutSpy.mock.calls).toEqual(
        Array(3).fill([expect.any(Function), defaultRetryDelay]),
      );
    });

    test('resolves if one of the retries succeeds', async () => {
      nock(mockUrl)
        .post(mockEndpoint)
        .reply(500) // Initial call
        .post(mockEndpoint)
        .reply(500) // First retry
        .post(mockEndpoint)
        .reply(200); // Second retry

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).resolves.toStrictEqual(axiosSuccessResponse);
    });
  });

  describe('given a retryable connection error', () => {
    test('retries up to max 3 times and then throws the error', async () => {
      const mockNetworkError = new Error('Node connection error');
      mockNetworkError.code = 'ECONNRESET';
      const scope = nock(mockUrl)
        .post(mockEndpoint)
        .times(4)
        .replyWithError(mockNetworkError);

      const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

      await expect(promise).rejects.toThrow(mockNetworkError);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('given a retryable 429 error response', () => {
    describe('with Retry-After header in seconds', () => {
      test('delays by the parsed amount before retrying', async () => {
        nock(mockUrl)
          .post(mockEndpoint)
          .reply(429, '429 Error', {
            'Retry-After': '0.5',
          })
          .post(mockEndpoint)
          .reply(200);

        const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

        await expect(promise).resolves.toStrictEqual(axiosSuccessResponse);
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
      });
    });

    describe('with Retry-After header in http datetime format', () => {
      test('delays by the parsed amount before retrying', async () => {
        nock(mockUrl)
          .post(mockEndpoint)
          .reply(429, '429 Error', {
            'Retry-After': 'Fri, 4 Dec 2020 11:00:01 GMT', // 1 second after mock Date.now()
          })
          .post(mockEndpoint)
          .reply(200);

        const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

        await expect(promise).resolves.toStrictEqual(axiosSuccessResponse);
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      });
    });

    describe('with no Retry-After header', () => {
      test('delays by the default amount before retrying', async () => {
        nock(mockUrl)
          .post(mockEndpoint)
          .reply(429)
          .post(mockEndpoint)
          .reply(200);

        const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

        await expect(promise).resolves.toStrictEqual(axiosSuccessResponse);
        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), defaultRetryDelay);
      });
    });

    describe('if the Retry-After value is greater than the maximum allowed', () => {
      test('rethrows the error without retrying', async () => {
        nock(mockUrl)
          .post(mockEndpoint)
          .reply(429, '429 Error', {
            'Retry-After': '5', // 5 seconds > maxRetryAfter
          });

        const promise = axiosRetryClient.post(mockUrl + mockEndpoint);

        await expect(promise).rejects.toThrow(axiosError(429));
      });
    });
  });
});
