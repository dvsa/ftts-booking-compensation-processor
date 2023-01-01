import { ManagedIdentityAuthConfig } from '../services/auth/types';
import { convertTimespanToSeconds, Seconds, Timespan } from '../utils/time';

interface Config {
  test: {
    testCentreId: string,
  }
  defaultTimeZone: string;
  websiteSiteName: string;
  functionTimeout: Seconds;
  functionTimeoutBuffer: Seconds;
  directoryStructure: {
    jobsRoot: string;
    targetRoot: string;
  };
  azureBlob: {
    connectionString: string;
    containerName: string;
  };
  crm: {
    apiUrl: string;
    fetchRecordsPerPage: string;
    maxRetries: string;
    identity: ManagedIdentityAuthConfig;
  };
  http: {
    timeout: number;
    retryClient: {
      maxRetries: number;
      defaultRetryDelay: number;
      maxRetryAfter: number;
    };
  };
  notification: {
    baseUrl: string;
    identity: ManagedIdentityAuthConfig;
  };
  scheduling: {
    baseUrl: string;
    identity: ManagedIdentityAuthConfig
  }
  featureToggle: {
    enableSendBookingCancellationUsingSendNotificationEndpointForCandidate: boolean,
    enableSendBookingCancellationUsingSendNotificationEndpointForTrainer: boolean
  }
}

const config: Config = {
  test: {
    testCentreId: process.env.INT_TEST_CENTRE_ID || '',
  },
  defaultTimeZone: process.env.DEFAULT_TIME_ZONE || 'Europe/London',
  websiteSiteName: process.env.WEBSITE_SITE_NAME || 'ftts-booking-compensation-processor',
  functionTimeout: convertTimespanToSeconds((process.env.AzureFunctionsJobHost__functionTimeout || '00:10:00') as Timespan),
  functionTimeoutBuffer: parseInt(process.env.FUNCTION_TIMEOUT_BUFFER_SECONDS || '30', 10),
  directoryStructure: {
    jobsRoot: process.env.BCP_JOBS_ROOT_DIR || 'jobs',
    targetRoot: process.env.BCP_TARGET_ROOT_DIR || 'job-runs',
  },
  azureBlob: {
    connectionString: process.env.BCP_FILE_STORAGE || '',
    containerName: process.env.BCP_CONTAINER_NAME || 'compensation-jobs',
  },
  crm: {
    apiUrl: process.env.CRM_API_URL || '',
    maxRetries: process.env.CRM_MAX_RETRIES || '10',
    fetchRecordsPerPage: process.env.CRM_FETCH_RECORDS_PER_PAGE || '5000',
    identity: {
      azureTenantId: process.env.CRM_TENANT_ID || '',
      azureClientId: process.env.CRM_CLIENT_ID || '',
      azureClientSecret: process.env.CRM_CLIENT_SECRET || '',
      scope: process.env.CRM_SCOPE || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
    },
  },
  http: {
    timeout: parseInt(process.env.DEFAULT_REQUEST_TIMEOUT || '30000', 10),
    retryClient: {
      maxRetries: parseInt(process.env.RETRY_CLIENT_MAX_RETRIES || '3', 10),
      defaultRetryDelay: parseInt(process.env.RETRY_CLIENT_DEFAULT_DELAY || '300', 10),
      maxRetryAfter: parseInt(process.env.RETRY_CLIENT_MAX_RETRY_AFTER || '1000', 10),
    },
  },
  scheduling: {
    baseUrl: process.env.SCHEDULING_API_BASE_URL || '',
    identity: {
      azureTenantId: process.env.SCHEDULING_TENANT_ID || '',
      azureClientId: process.env.SCHEDULING_CLIENT_ID || '',
      azureClientSecret: process.env.SCHEDULING_CLIENT_SECRET || '',
      scope: process.env.SCHEDULING_API_SCOPE || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
    },
  },
  notification: {
    baseUrl: process.env.NOTIFICATION_API_BASE_URL || '',
    identity: {
      azureTenantId: process.env.NOTIFICATIONS_TENANT_ID || '',
      azureClientId: process.env.NOTIFICATIONS_CLIENT_ID || '',
      azureClientSecret: process.env.NOTIFICATIONS_CLIENT_SECRET || '',
      scope: process.env.NOTIFICATION_API_SCOPE || '',
      userAssignedEntityClientId: process.env.USER_ASSIGNED_ENTITY_CLIENT_ID || '',
    },
  },
  featureToggle: {
    enableSendBookingCancellationUsingSendNotificationEndpointForCandidate: process.env.ENABLE_SEND_BOOKING_CANCELLATION_USING_SEND_NOTIFICATION_ENDPOINT_FOR_CANDIDATE === 'true',
    enableSendBookingCancellationUsingSendNotificationEndpointForTrainer: process.env.ENABLE_SEND_BOOKING_CANCELLATION_USING_SEND_NOTIFICATION_ENDPOINT_FOR_TRAINER === 'true',
  },
};

export {
  config,
  Config,
};
