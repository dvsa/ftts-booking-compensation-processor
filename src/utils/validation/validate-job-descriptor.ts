import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import AjvErrors from 'ajv-errors';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isToday from 'dayjs/plugin/isToday';
import utc from 'dayjs/plugin/utc';
import { jobDescriptorSchema } from './job-descriptor.schema';
import { JsonObject } from '../../types';

const ajv = AjvErrors(new Ajv({ allErrors: true }));
addFormats(ajv);

dayjs.extend(isBetween);
dayjs.extend(isToday);
dayjs.extend(utc);

export type ValidationResult =
  | { isValid: true }
  | { isValid: false, errorMessage: string };

export const validateJobDescriptor = (input: JsonObject): ValidationResult => {
  const validated = ajv.validate(jobDescriptorSchema, input);
  const {
    dateFrom, dateTo, testCentreIds, allTestCentres,
  } = input;

  if (!validated) {
    // Custom error messages set in schema.errorMessage
    const errorMessage = ajv.errors?.[0].message || 'unknown error';
    return {
      isValid: false,
      errorMessage,
    };
  }

  // Extra checks not handled by JSON schema
  if (testCentreIds === undefined && allTestCentres === undefined) {
    return {
      isValid: false,
      errorMessage: 'one of testCentreIds or allTestCentres is required',
    };
  }
  if (testCentreIds !== undefined && allTestCentres === true) {
    return {
      isValid: false,
      errorMessage: 'testCentreIds should be omitted when allTestCentres set to true',
    };
  }
  if ((dateFrom as string) > (dateTo as string)) {
    return {
      isValid: false,
      errorMessage: 'dateFrom should be before dateTo',

    };
  }

  const isDateFromEqualToToday = dayjs(dateFrom as string).utc().isToday();
  const isDateToEqualToToday = dayjs(dateTo as string).utc().isToday();
  const isTodayWithinDateRange = dayjs(dayjs.utc().format()).isBetween((dateFrom as string), (dateTo as string), null, '[]');

  if (isDateFromEqualToToday || isDateToEqualToToday || isTodayWithinDateRange) {
    return {
      isValid: false,
      errorMessage: 'You cannot run this process for a date range that includes todays date',
    };
  }

  return { isValid: true };
};
