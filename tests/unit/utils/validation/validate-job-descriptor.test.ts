import MockDate from 'mockdate';
import { JsonObject } from '../../../../src/types';
import { validateJobDescriptor, ValidationResult } from '../../../../src/utils/validation/validate-job-descriptor';
import { buildMockJobDescriptor } from '../../../stubs/job-descriptor.mock';

describe('validateJobDescriptor', () => {
  let mockInput: JsonObject;
  beforeEach(() => {
    mockInput = buildMockJobDescriptor();
  });

  afterEach(() => {
    MockDate.reset();
  });

  describe('valid inputs - returns valid result', () => {
    test('all properties', () => {
      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('missing optional dryRun', () => {
      delete mockInput.dryRun;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('missing optional ignoreCandidateBookings', () => {
      delete mockInput.ignoreCandidateBookings;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('missing optional ignoreTrainerBookerBookings', () => {
      delete mockInput.ignoreTrainerBookerBookings;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('only testCentreIds', () => {
      delete mockInput.allTestCentres;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('only allTestCentres=true', () => {
      delete mockInput.testCentreIds;
      mockInput.allTestCentres = true;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({ isValid: true });
    });

    test('current date is after dateTo', () => {
      const dateObject = new Date();

      dateObject.setUTCDate(dateObject.getUTCDate() - 4);
      let date = dateObject.toISOString();
      mockInput.dateFrom = date;

      dateObject.setUTCDate(dateObject.getUTCDate() + 2);
      date = dateObject.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: true,
      });
    });

    test('current date is before dateFrom', () => {
      const dateObject = new Date();

      dateObject.setUTCDate(dateObject.getUTCDate() + 1);
      let date = dateObject.toISOString();
      mockInput.dateFrom = date;

      dateObject.setUTCDate(dateObject.getUTCDate() + 4);
      date = dateObject.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: true,
      });
    });

    test('dateTo is upto the boundary of the current date when BST - passes validation', () => {
      const globalDate = new Date('2021-09-11T14:30:45.979Z');
      MockDate.set(globalDate);

      mockInput.dateFrom = '2021-09-09T00:00:00Z';
      mockInput.dateTo = '2021-09-10T23:59:59Z';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: true,
      });
    });

    test('dateFrom starts after the boundary of the current date when BST - passes validation', () => {
      const globalDate = new Date('2021-09-11T14:30:45.979Z');
      MockDate.set(globalDate);

      mockInput.dateFrom = '2021-09-12T00:00:00Z';
      mockInput.dateTo = '2021-09-13T00:00:00Z';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: true,
      });
    });
  });

  describe('invalid inputs - returns invalid result with reason', () => {
    test('empty object', () => {
      mockInput = {};

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateFrom is required',
      });
    });

    test('missing required dateFrom', () => {
      delete mockInput.dateFrom;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateFrom is required',
      });
    });

    test('missing required dateTo', () => {
      mockInput.dateTo = undefined;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateTo is required',
      });
    });

    test('missing required businessCancelReason', () => {
      delete mockInput.businessCancelReason;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'businessCancelReason is required',
      });
    });

    test('dateFrom not an ISO datetime string', () => {
      mockInput.dateFrom = 'Fri Jul 16 2021 12:30:00 UTC';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateFrom should be an ISO datetime string in UTC',
      });
    });

    test('ISO datetime string not in UTC', () => {
      mockInput.dateFrom = '2021-07-01T14:00:00+01:00';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateFrom should be an ISO datetime string in UTC',
      });
    });

    test('dateTo not an ISO datetime string', () => {
      mockInput.dateTo = 'not a datetime string!';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateTo should be an ISO datetime string in UTC',
      });
    });

    test('dateFrom after dateTo', () => {
      mockInput.dateFrom = '2021-07-10T00:00:00Z';
      mockInput.dateTo = '2021-07-01T00:00:00Z';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dateFrom should be before dateTo',
      });
    });

    test('testCentreIds not an array of strings', () => {
      mockInput.testCentreIds = 'test-centre-001';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'testCentreIds should be an array of strings',
      });
    });

    test('allTestCentres not a boolean', () => {
      mockInput.allTestCentres = 'true';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'allTestCentres should be a boolean',
      });
    });

    test('businessCancelReason not a string', () => {
      mockInput.businessCancelReason = { foo: 'bar' };

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'businessCancelReason should be a non-empty string',
      });
    });

    test('empty businessCancelReason', () => {
      mockInput.businessCancelReason = ' ';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'businessCancelReason should be a non-empty string',
      });
    });

    test('missing required cancelReasonCode', () => {
      delete mockInput.cancelReasonCode;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'cancelReasonCode is required',
      });
    });

    test('cancelReasonCode not a number', () => {
      mockInput.cancelReasonCode = true;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'cancelReasonCode should match defined values',
      });
    });

    test('cancelReasonCode has wrong value', () => {
      mockInput.cancelReasonCode = 123;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'cancelReasonCode should match defined values',
      });
    });

    test('dryRun not a boolean', () => {
      mockInput.dryRun = null;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'dryRun should be a boolean',
      });
    });

    test('ignoreCandidateBookings not a boolean', () => {
      mockInput.ignoreCandidateBookings = 'not a boolean';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'ignoreCandidateBookings should be a boolean',
      });
    });

    test('ignoreTrainerBookerBookings not a boolean', () => {
      mockInput.ignoreTrainerBookerBookings = 'not a boolean';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'ignoreTrainerBookerBookings should be a boolean',
      });
    });

    test('both testCentreIds and allTestCentres missing', () => {
      mockInput.testCentreIds = undefined;
      delete mockInput.allTestCentres;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'one of testCentreIds or allTestCentres is required',
      });
    });

    test('both testCentreIds and allTestCentres=true set', () => {
      mockInput.testCentreIds = ['test-centre-001'];
      mockInput.allTestCentres = true;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'testCentreIds should be omitted when allTestCentres set to true',
      });
    });

    test('additional properties', () => {
      mockInput.foo = 'bar';

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'additional properties are not allowed',
      });
    });

    test('current date is inbetween dateFrom and dateTo', () => {
      const dateObject = new Date();

      dateObject.setUTCDate(dateObject.getUTCDate() - 2);
      let date = dateObject.toISOString();
      mockInput.dateFrom = date;

      dateObject.setUTCDate(dateObject.getUTCDate() + 4);
      date = dateObject.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });

    test('current date is same day as dateFrom and DateTo but dateFrom and dateTo are after current date', () => {
      const dateFrom = new Date();
      const dateTo = new Date();

      dateFrom.setUTCHours(dateFrom.getUTCHours() + 2);
      let date = dateFrom.toISOString();
      mockInput.dateFrom = date;

      dateTo.setUTCHours(dateTo.getUTCHours() + 4);
      date = dateTo.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });

    test('current date is same day as dateFrom and DateTo', () => {
      const dateFrom = new Date();
      const dateTo = new Date();

      dateFrom.setUTCHours(dateFrom.getUTCHours() - 2);
      let date = dateFrom.toISOString();
      mockInput.dateFrom = date;

      dateTo.setUTCHours(dateTo.getUTCHours() + 4);
      date = dateTo.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });

    test('current date is same day as dateFrom and DateTo but dateFrom and dateTo are before current date', () => {
      const dateFrom = new Date();
      const dateTo = new Date();

      dateFrom.setUTCHours(dateFrom.getUTCHours() - 4);
      let date = dateFrom.toISOString();
      mockInput.dateFrom = date;

      dateTo.setUTCHours(dateTo.getUTCHours() - 2);
      date = dateTo.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });

    test('current date is same day as dateFrom and DateTo is in the future', () => {
      const dateFrom = new Date();
      const dateTo = new Date();

      dateFrom.setUTCHours(dateFrom.getUTCHours() + 2);
      let date = dateFrom.toISOString();
      mockInput.dateFrom = date;

      dateTo.setUTCDate(dateTo.getUTCDate() + 2);
      date = dateTo.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });

    test('current date is the same as DateTo and dateFrom is in the past', () => {
      const dateFrom = new Date();
      const dateTo = new Date();

      dateFrom.setUTCDate(dateFrom.getUTCDate() - 2);
      let date = dateFrom.toISOString();
      mockInput.dateFrom = date;

      dateTo.setUTCHours(dateTo.getUTCHours() - 2);
      date = dateTo.toISOString();
      mockInput.dateTo = date;

      const result = validateJobDescriptor(mockInput);

      expect(result).toStrictEqual<ValidationResult>({
        isValid: false,
        errorMessage: 'You cannot run this process for a date range that includes todays date',
      });
    });
  });
});
