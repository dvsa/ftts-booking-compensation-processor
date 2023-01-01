import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import path from 'path';
import { config } from '../config';
import { JobDescriptorValidationError } from '../errors/job-descriptor-validation-error';
import { BusinessTelemetryEvents, logger } from '../libraries/logger';
import { AzureBlobClient } from '../services/azure-blob-client';
import {
  Job, JobDescriptor, JobResult, JsonObject,
} from '../types';
import { validateJobDescriptor } from '../utils/validation/validate-job-descriptor';
import { CandidateProcessor } from './candidate/candidate-processor';
import { TrainerBookerProcessor } from './trainer-booker/trainer-booker-processor';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const extractFilename = (filepath: string) => path.basename(filepath, '.json');

export class BookingCompensationProcessor {
  constructor(
    private azureBlobClient = new AzureBlobClient(),
    private candidateProcessor = new CandidateProcessor(),
    private trainerBookerProcessor = new TrainerBookerProcessor(),
  ) { }

  public async scanForJobs(): Promise<Job | undefined> {
    const jobFiles = await this.azureBlobClient.listFiles(config.directoryStructure.jobsRoot);
    logger.info(`BookingCompensationProcessor::scanForJobs: Found ${jobFiles.length} job descriptor file${jobFiles.length > 1 ? 's' : ''}`, { jobFiles });
    if (jobFiles.length === 0) {
      return undefined;
    }

    jobFiles.sort(); // Want first file in alphabetical order
    const jobFilePath = jobFiles[0];
    const jobName = extractFilename(jobFilePath);
    logger.info(`BookingCompensationProcessor::scanForJobs: Fetching job file ${jobFilePath}`);
    const jobFile = await this.azureBlobClient.downloadFile(jobFilePath);

    const jobDescriptor = JSON.parse(jobFile.toString()) as JsonObject;
    this.assertIsValidJobDescriptor(jobDescriptor, jobName);

    return {
      name: jobName,
      descriptor: jobDescriptor,
    };
  }

  public async processJob(jobName: string, jobDescriptor: JobDescriptor, executionStartDateTime: Date): Promise<void> {
    const targetDirectory = this.resolveTargetDirectory(jobName, jobDescriptor.dryRun);
    logger.info(`BookingCompensationProcessor::processJob: Creating target directory ${targetDirectory}`);
    await this.azureBlobClient.uploadFile(`${targetDirectory}/${jobName}.json`, JSON.stringify(jobDescriptor));

    let candidateProcessJobResult: JobResult;
    let trainerBookerProcessJobResult: JobResult;

    if (!jobDescriptor.ignoreCandidateBookings) {
      candidateProcessJobResult = await this.candidateProcessor.processJob(jobName, jobDescriptor, targetDirectory, executionStartDateTime);
      logger.event(BusinessTelemetryEvents.BCP_FINISHED_CANDIDATE_BOOKING_PROCESSING, 'BookingCompensationProcessor::processJob: Finished processing candidate bookings');
    } else {
      candidateProcessJobResult = { jobFinished: true };
      logger.event(BusinessTelemetryEvents.BCP_SKIPPED_CANDIDATE_BOOKINGS, 'BookingCompensationProcessor::processJob: Candidate bookings have been skipped, will not process', {
        jobName,
        jobDescriptor,
      });
    }

    if (!jobDescriptor.ignoreTrainerBookerBookings && candidateProcessJobResult.jobFinished) {
      trainerBookerProcessJobResult = await this.trainerBookerProcessor.processJob(jobName, jobDescriptor, targetDirectory, executionStartDateTime);
      logger.event(BusinessTelemetryEvents.BCP_FINISHED_TRAINER_BOOKER_BOOKING_PROCESSING, 'BookingCompensationProcessor::processJob: Finished processing trainer booker bookings');
    } else {
      trainerBookerProcessJobResult = { jobFinished: true };
      logger.event(BusinessTelemetryEvents.BCP_SKIPPED_TRAINER_BOOKER_BOOKINGS, 'BookingCompensationProcessor::processJob: Trainer booker bookings have been skipped, will not process', {
        jobName,
        jobDescriptor,
      });
    }

    if (candidateProcessJobResult.jobFinished && trainerBookerProcessJobResult.jobFinished) {
      logger.info(`BookingCompensationProcessor::processJob: Successfully finished job, deleting descriptor file ${jobName}`);
      await this.azureBlobClient.deleteFile(`${config.directoryStructure.jobsRoot}/${jobName}.json`);
    } else {
      logger.info(`BookingCompensationProcessor::processJob: Job unfinished, not deleting descriptor file ${jobName}`, {
        reason: candidateProcessJobResult.reason || trainerBookerProcessJobResult.reason,
      });
    }
  }

  private assertIsValidJobDescriptor(input: JsonObject, jobName: string): asserts input is JobDescriptor {
    const result = validateJobDescriptor(input);
    if (!result.isValid) {
      logger.warn('BookingCompensationProcessor::assertIsValidJobDescriptor: Invalid job descriptor', {
        jobName,
        reason: result.errorMessage,
      });
      throw new JobDescriptorValidationError(`BookingCompensationProcessor::assertIsValidJobDescriptor: Invalid job descriptor ${jobName} - ${result.errorMessage}`);
    }
  }

  private resolveTargetDirectory(jobName: string, dryRun: boolean | undefined): string {
    return `${config.directoryStructure.targetRoot}/${jobName}/${dryRun ? 'dry-run/' : ''}${dayjs.utc().format('YYYYMMDD_HHmmss')}`;
  }
}
