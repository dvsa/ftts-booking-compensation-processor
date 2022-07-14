import { JobDescriptor } from '../../src/types';

export const mockTestCentreIds = ['test-centre-001', 'test-centre-002', 'test-centre-003'];

export const buildMockJobDescriptor = (): JobDescriptor => ({
  dateFrom: '2021-07-01T14:00:00Z',
  dateTo: '2021-07-10T20:00:00Z',
  testCentreIds: mockTestCentreIds,
  allTestCentres: false,
  businessCancelReason: 'global pandemic happened',
  cancelReasonCode: 675030006,
  dryRun: false,
  ignoreTrainerBookerBookings: false,
  ignoreCandidateBookings: false,
});
