import { mocked } from 'ts-jest/utils';
import { config } from '../../src/config';

const mockedConfig = mocked(config);

export default mockedConfig;
