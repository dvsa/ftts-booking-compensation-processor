import { mocked } from 'ts-jest/utils';
import { logger } from '../../src/libraries/logger';

const mockedLogger = mocked(logger, true);

export default mockedLogger;
