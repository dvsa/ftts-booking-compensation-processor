import mockFs from 'mock-fs';
import { XmlQueryBuilder } from '../../../../../src/services/crm/queries/xml-query-builder';
import { BookingStatus } from '../../../../../src/services/crm/types/enums';
import mockedConfig from '../../../../stubs/config.mock';

const xmlQueryBuilder = new XmlQueryBuilder();

describe('XmlQueryBuilder', () => {
  beforeEach(() => {
    mockedConfig.crm.fetchRecordsPerPage = '100';
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  describe('buildGetCandidateBookingsQuery', () => {
    beforeEach(() => {
      mockFs({
        './src/services/crm/queries': {
          'get-candidate-bookings.xml':
            '<fetch version="1.0" count="{{recordsPerPage}}">...{{dateFrom}}...{{dateTo}}...{{testCentreIdsFilter}}...</fetch>',
        },
      });
    });

    test('constructs the xml query for the given parameters.. without testCentreIds', async () => {
      const mockDateFrom = '2021-08-02T00:00:00Z';
      const mockDateTo = '2021-08-05T00:00:00Z';

      const query = await xmlQueryBuilder.buildGetCandidateBookingsQuery(mockDateFrom, mockDateTo);

      expect(query).toBe(`<fetch version="1.0" count="100">...${mockDateFrom}...${mockDateTo}......</fetch>`);
    });

    test('constructs the xml query for the given parameters.. with testCentreIds', async () => {
      const mockDateFrom = '2021-08-02T00:00:00Z';
      const mockDateTo = '2021-08-05T00:00:00Z';
      const testCentreIds = ['test-centre-001', 'test-centre-002'];

      const query = await xmlQueryBuilder.buildGetCandidateBookingsQuery(mockDateFrom, mockDateTo, testCentreIds);

      const expectedTestCentreIdsFilter = '<filter type="and"><filter type="or"><condition attribute="accountid" operator="eq" value="test-centre-001" /><condition attribute="accountid" operator="eq" value="test-centre-002" /></filter></filter>';
      expect(query).toBe(`<fetch version="1.0" count="100">...${mockDateFrom}...${mockDateTo}...${expectedTestCentreIdsFilter}...</fetch>`);
    });
  });

  describe('buildGetTrainerBookerBookingsQuery', () => {
    beforeEach(() => {
      mockFs({
        './src/services/crm/queries': {
          'get-trainer-booker-bookings.xml':
            '<fetch version="1.0" count="{{recordsPerPage}}">...{{dateFrom}}...{{dateTo}}...{{testCentreIdsFilter}}...{{unassignedBookingStatus}}...{{assignedBookingStatus}}...{{expiredBookedSlotStatus}}</fetch>',
        },
      });
    });

    test('constructs the xml query for the given parameters.. without testCentreIds', async () => {
      const mockDateFrom = '2021-08-02T00:00:00Z';
      const mockDateTo = '2021-08-05T00:00:00Z';

      const query = await xmlQueryBuilder.buildGetTrainerBookerBookingsQuery(mockDateFrom, mockDateTo);

      expect(query).toBe(`<fetch version="1.0" count="100">...${mockDateFrom}...${mockDateTo}......${BookingStatus.UNASSIGNED}...${BookingStatus.ASSIGNED}...${BookingStatus.EXPIRED}</fetch>`);
    });

    test('constructs the xml query for the given parameters.. with testCentreIds', async () => {
      const mockDateFrom = '2021-08-02T00:00:00Z';
      const mockDateTo = '2021-08-05T00:00:00Z';
      const testCentreIds = ['test-centre-001', 'test-centre-002'];

      const query = await xmlQueryBuilder.buildGetTrainerBookerBookingsQuery(mockDateFrom, mockDateTo, testCentreIds);

      const expectedTestCentreIdsFilter = '<filter type="and"><filter type="or"><condition attribute="accountid" operator="eq" value="test-centre-001" /><condition attribute="accountid" operator="eq" value="test-centre-002" /></filter></filter>';
      expect(query).toBe(`<fetch version="1.0" count="100">...${mockDateFrom}...${mockDateTo}...${expectedTestCentreIdsFilter}...${BookingStatus.UNASSIGNED}...${BookingStatus.ASSIGNED}...${BookingStatus.EXPIRED}</fetch>`);
    });
  });
});
