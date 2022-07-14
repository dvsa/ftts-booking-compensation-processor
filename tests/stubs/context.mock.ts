import { Context, Logger } from '@azure/functions';
import { logger } from '../../src/libraries/logger';

export const mockedContext: Context = {
  invocationId: '',
  executionContext: {
    invocationId: '',
    functionName: '',
    functionDirectory: '',
  },
  bindings: {},
  bindingData: {},
  traceContext: {
    traceparent: null,
    tracestate: null,
    attributes: {},
  },
  bindingDefinitions: [],
  log: logger as unknown as Logger,
  done: (): void => {},
};
