import {
  asFullDateWithWeekday, asLocalTime,
} from '../../../../src/services/notification/content/filters/local-date-time-filter';

describe('Custom date/time dateTimeFilters tests', () => {
  describe('asLocalTime', () => {
    test('returns the local time in the format "5:30pm" given an ISO datetime string', () => {
      const isoDateString = '2018-11-08T17:30:56Z';
      expect(asLocalTime(isoDateString)).toBe('5:30pm');
    });
  });

  describe('asFullDateWithWeekday', () => {
    test('returns the date in the format "Thursday 8 November 2018" given an ISO datetime string', () => {
      const isoDateString = '2018-11-08T10:00:56Z';
      expect(asFullDateWithWeekday(isoDateString)).toBe('Thursday 8 November 2018');
    });
  });
});
