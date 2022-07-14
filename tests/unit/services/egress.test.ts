import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { onInternalAccessDeniedError } from '../../../src/services/egress';
import { BusinessTelemetryEvents } from '../../../src/libraries/logger';
import mockedLogger from '../../stubs/logger.mock';

describe('egress', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onInternalAccessDeniedError', () => {
    test('proper event gets logged if url is not-whitelisted', () => {
      const error: InternalAccessDeniedError = new InternalAccessDeniedError('localhost', '80', 'Unrecognised address');
      expect(() => onInternalAccessDeniedError(error)).toThrow(error);
      expect(mockedLogger.event).toHaveBeenCalledWith(BusinessTelemetryEvents.NOT_WHITELISTED_URL_CALL, error.message, {
        host: error.host,
        port: error.port,
        reason: JSON.stringify(error),
      });
    });
  });
});
