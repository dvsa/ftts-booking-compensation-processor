// Setup global mocks
jest.mock('@dvsa/azure-logger');
jest.mock('./src/libraries/logger');
jest.mock('./src/config');

// Setup env vars
process.env.NODE_ENV = 'test';
process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'test';
