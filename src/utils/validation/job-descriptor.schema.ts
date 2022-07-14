export const jobDescriptorSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  required: [
    'dateFrom',
    'dateTo',
    'businessCancelReason',
    'cancelReasonCode',
  ],
  properties: {
    dateFrom: {
      type: 'string',
      format: 'date-time',
      pattern: 'Z$', // UTC ISO string (ending in Z)
      examples: [
        '2021-07-16T14:00:00.000Z',
      ],
    },
    dateTo: {
      type: 'string',
      format: 'date-time',
      pattern: 'Z$', // UTC ISO string (ending in Z)
      examples: [
        '2021-07-18T09:30:00.000Z',
      ],
    },
    testCentreIds: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    allTestCentres: {
      type: 'boolean',
    },
    businessCancelReason: {
      type: 'string',
      pattern: '[^-\\s]', // Not empty/whitespace
    },
    dryRun: {
      type: 'boolean',
    },
    ignoreCandidateBookings: {
      type: 'boolean',
    },
    ignoreTrainerBookerBookings: {
      type: 'boolean',
    },
    cancelReasonCode: {
      type: 'integer',
      enum: [675030007, 675030008, 675030009, 675030000, 675030001, 675030002, 675030003, 675030004, 675030005, 675030006],
    },
  },
  errorMessage: { // Custom error messages via ajv-errors
    additionalProperties: 'additional properties are not allowed',
    required: {
      dateFrom: 'dateFrom is required',
      dateTo: 'dateTo is required',
      businessCancelReason: 'businessCancelReason is required',
      cancelReasonCode: 'cancelReasonCode is required',
    },
    properties: {
      dateFrom: 'dateFrom should be an ISO datetime string in UTC',
      dateTo: 'dateTo should be an ISO datetime string in UTC',
      testCentreIds: 'testCentreIds should be an array of strings',
      allTestCentres: 'allTestCentres should be a boolean',
      businessCancelReason: 'businessCancelReason should be a non-empty string',
      dryRun: 'dryRun should be a boolean',
      ignoreCandidateBookings: 'ignoreCandidateBookings should be a boolean',
      ignoreTrainerBookerBookings: 'ignoreTrainerBookerBookings should be a boolean',
      cancelReasonCode: 'cancelReasonCode should match defined values',
    },
  },
};
