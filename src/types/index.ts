import { CancelReason } from '../services/crm/types/enums';

export type JsonObject = Record<string, unknown>;

/**
 * testCentreIds only set if allTestCentres!=true
 */
export type JobDescriptor = {
  dateFrom: string; // ISO datetime in UTC
  dateTo: string; // ISO datetime in UTC
  dryRun?: boolean;
  businessCancelReason: string;
  cancelReasonCode: CancelReason;
  ignoreCandidateBookings?: boolean;
  ignoreTrainerBookerBookings?: boolean;
} & (
  | { allTestCentres?: false; testCentreIds: string[]; }
  | { allTestCentres: true; }
);

export type Job = {
  descriptor: JobDescriptor
  name: string,
};

export type JobResult = {
  jobFinished: boolean;
  reason?: string;
};
