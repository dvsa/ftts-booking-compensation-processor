import { Address, InternalAccessDeniedError, addressParser } from '@dvsa/egress-filtering';
import { logger, BusinessTelemetryEvents } from '../libraries/logger';
import { config } from '../config';

const allowedAddresses: Address[] = [
  addressParser.parseUri(config.crm.apiUrl),
  ...addressParser.parseConnectionString(config.azureBlob.connectionString),
  addressParser.parseUri(config.notification.baseUrl),
];

const onInternalAccessDeniedError = (error: InternalAccessDeniedError): void => {
  logger.security('egress::OnInternalAccessDeniedError: url is not whitelisted so it cannot be called', {
    host: error.host,
    port: error.port,
    reason: JSON.stringify(error),
  });

  logger.event(BusinessTelemetryEvents.NOT_WHITELISTED_URL_CALL, error.message, {
    host: error.host,
    port: error.port,
    reason: JSON.stringify(error),
  });

  throw error;
};

export {
  allowedAddresses,
  onInternalAccessDeniedError,
};
