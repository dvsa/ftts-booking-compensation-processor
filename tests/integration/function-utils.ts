/* eslint-disable no-await-in-loop */
import axios from 'axios';

const FUNCTION_HOST = process.env.FUNCTION_HOST || 'http://localhost:7071';
const FUNCTION_ENDPOINT = 'admin/functions/booking-compensation-processor';

export const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export const runFunction = async (): Promise<void> => {
  const requestHeaders: Record<string, string> = {};
  if (process.env.FUNCTION_MASTER_KEY) {
    requestHeaders['x-functions-key'] = process.env.FUNCTION_MASTER_KEY;
  }
  await axios.post(`${FUNCTION_HOST}/${FUNCTION_ENDPOINT}`, {}, {
    headers: requestHeaders,
  });
};

export const waitUntilJobIsDone = async (condition: () => Promise<boolean>, maxTries: number, timeout: number): Promise<void> => {
  for (let i = 0; i < maxTries; i++) {
    if (await condition()) {
      return;
    }
    await sleep(timeout);
  }
  throw new Error('waitUntilJobIsDone:: condition not fulfilled on time');
};
