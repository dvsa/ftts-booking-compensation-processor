/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import axiosRetry, { isNetworkError, isRetryableError } from 'axios-retry';
import dayjs from 'dayjs';

import { config } from '../config';
import { CustomAxiosError, logger } from './logger';

const { maxRetries, defaultRetryDelay, maxRetryAfter } = config.http.retryClient;

const is429Error = (err: CustomAxiosError): boolean => err.response?.status === 429;

const parseRetryAfter = (header: string): number | undefined => {
  // Header value may be a string containing number of *seconds*
  const parsed = parseFloat(header);
  if (!Number.isNaN(parsed) && parsed >= 0) {
    return parsed * 1000;
  }
  // Or a date in http datetime string format
  const date = dayjs(header);
  if (date.isValid()) {
    const now = dayjs();
    const diff = date.diff(now, 'ms');
    if (diff >= 0) {
      return diff;
    }
  }
  return undefined; // Otherwise invalid
};

const axiosRetryClient = axios.create();
axiosRetry(axiosRetryClient, {
  retries: maxRetries,
  // Retry if network/connection error, 5xx response or 429 response
  retryCondition: (err) => isNetworkError(err) || isRetryableError(err) || is429Error(err),
  retryDelay: (retryCount, err) => {
    let delay = defaultRetryDelay;

    if (is429Error(err)) {
      // CustomAxiosError response.data is any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const retryAfterHeader = err.response?.headers?.['retry-after'];
      if (retryAfterHeader) {
        delay = parseRetryAfter(retryAfterHeader) ?? defaultRetryDelay;
        if (delay > maxRetryAfter) {
          throw err;
        }
      }
    }

    logger.warn(`Retrying failed ${err.config.method || '::no method::'} request to ${err.config.url || '::no url::'} - attempt ${retryCount} of ${maxRetries}`, {
      error: err.toString(),
      status: err.response?.status,
      url: err.config?.url,
      retryDelayMs: delay,
    });

    return delay;
  },
});

export default axiosRetryClient;
