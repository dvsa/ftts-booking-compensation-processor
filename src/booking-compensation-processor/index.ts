import 'source-map-support/register'; // Source map support for .ts stack traces
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { AzureFunction, Context } from '@azure/functions';
import { withEgressFiltering } from '@dvsa/egress-filtering';
import { onInternalAccessDeniedError, allowedAddresses } from '../services/egress';
import { BookingCompensationProcessor } from './booking-compensation-processor';
import { logger } from '../libraries/logger';

export const bookingCompensationProcessorTimerTrigger: AzureFunction = async (): Promise<void> => {
  const executionStartDateTime = new Date();
  const bookingCompensationProcessor = new BookingCompensationProcessor();
  const job = await bookingCompensationProcessor.scanForJobs();
  if (!job) {
    logger.info('bookingCompensationProcessorTimerTrigger: No jobs found');
    return;
  }
  logger.info(`bookingCompensationProcessorTimerTrigger: Starting processing job ${job.name}`);
  await bookingCompensationProcessor.processJob(job.name, job.descriptor, executionStartDateTime);
};

export const index = async (context: Context): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(bookingCompensationProcessorTimerTrigger, allowedAddresses, onInternalAccessDeniedError, logger),
  context,
);
