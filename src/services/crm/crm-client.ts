import DynamicsWebApi, { UpdateRequest } from 'dynamics-web-api';
import dayjs from 'dayjs';
import { newDynamicsWebApi } from './dynamics-web-api';
import { XmlQueryBuilder } from './queries/xml-query-builder';
import {
  BookingStatus,
  CancelReason,
  Collection,
  FinanceTransactionStatus,
  Origin,
  OriginType,
  TriggerAction,
} from './types/enums';
import { typeGuards } from './types/type-guards';
import { CrmError } from '../../errors/crm-error';
import { BusinessTelemetryEvents, logger } from '../../libraries/logger';
import { BaseBooking, CandidateBooking, UpdatedCRMBookingProduct } from './types/bookings';
import { getBookingIdentifiers } from '../../utils/identifiers';

const crmErrorProperties = (error: DynamicsWebApi.RequestError): Record<string, unknown> => ({
  message: error.message,
  stack: error.stack,
  status: error.status,
  code: error.code,
  innerError: error.innererror,
});

export class CrmClient {
  constructor(
    private dynamicsWebApi = newDynamicsWebApi(),
    private xmlQueryBuilder = new XmlQueryBuilder(),
  ) { }

  public async getBookingsByOrigin<T extends BaseBooking>(originType: OriginType, dateFrom: string, dateTo: string, testCentreIds?: string[]): Promise<T[]> {
    try {
      logger.info(`CrmClient::getBookingsByOrigin: Trying to fetch records from the ${originType} portal`);
      let xmlQuery: string;
      if (originType === OriginType.TRAINER_BOOKER) {
        xmlQuery = await this.xmlQueryBuilder.buildGetTrainerBookerBookingsQuery(dateFrom, dateTo, testCentreIds);
      } else {
        xmlQuery = await this.xmlQueryBuilder.buildGetCandidateBookingsQuery(dateFrom, dateTo, testCentreIds);
      }
      const records = await this.fetchRecordsPageByPage<T>(
        Collection.BOOKING_PRODUCTS, xmlQuery,
      );
      const validRecords = records.filter(originType === OriginType.TRAINER_BOOKER ? typeGuards.TrainerBookerBooking : typeGuards.CandidateBooking);
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_SUCCEEDED, `CrmClient::getBookingsByOrigin: Successfully fetched ${validRecords.length} records`, {
        type: originType,
        validRecordsCount: validRecords.length,
        invalidRecordsCount: records.length - validRecords.length,
      });
      return validRecords;
    } catch (error) {
      logger.event(BusinessTelemetryEvents.BCP_BOOKING_IDENTIFICATION_FAILED, 'CrmClient::getBookingsByOrigin: Failed to fetch any records', {
        type: originType,
        ...crmErrorProperties(error as DynamicsWebApi.RequestError),
      });
      throw new CrmError(`Failed to fetch ${originType} booking records - ${(error as Error).message}`);
    }
  }

  public async batchUpdateBookedSlotTriggerAction(bookedSlotIds: string[], triggerAction: TriggerAction, cancelReasonCode: CancelReason): Promise<void> {
    if (bookedSlotIds?.length === 0) {
      logger.warn('CRMClient::batchUpdateBookedSlotTriggerAction: bookedSlotIds input array is empty');
      return;
    }
    try {
      const dateTimeNow = dayjs().toISOString();
      const requests: DynamicsWebApi.UpdateRequest[] = bookedSlotIds.map((bookedSlotId) => ({
        key: bookedSlotId,
        collection: 'ftts_bookedslots',
        entity: {
          ftts_triggeraction: triggerAction,
          ftts_canceldate: dateTimeNow,
          ftts_cancelreason: cancelReasonCode,
        },
      }));
      this.dynamicsWebApi.startBatch();
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      requests.forEach((request) => this.dynamicsWebApi.updateRequest(request));
      logger.debug('CRMClient::batchUpdateBookedSlotTriggerAction: Raw Batch Request', {
        requests,
        bookedSlotIds,
      });
      await this.dynamicsWebApi.executeBatch();
      logger.event(BusinessTelemetryEvents.BCP_BOOKED_SLOT_CRM_CANCELLATION_SUCCEEDED, 'CrmClient::batchUpdateBookedSlotTriggerAction: Sucessfully cancelled booked slots', {
        bookedSlotIds,
      });
    } catch (error) {
      logger.event(BusinessTelemetryEvents.BCP_BOOKED_SLOT_CRM_CANCELLATION_FAILED, 'CrmClient::batchUpdateBookedSlotTriggerAction: Failed to update booked slot trigger action field', {
        bookedSlotIds,
        ...crmErrorProperties(error as DynamicsWebApi.RequestError),
      });
      throw error;
    }
  }

  public async markBookingAsCompensated(booking: CandidateBooking, cancelReasonCode: CancelReason, updatedTCN?: boolean): Promise<void> {
    try {
      const isCustomerServiceCentreBooking = booking.origin === Origin.CUSTOMER_SERVICES_CENTRE;
      const dateTimeNow = dayjs().toISOString();
      const updateBookingProductRequest: UpdateRequest<UpdatedCRMBookingProduct> = {
        collection: 'ftts_bookingproducts',
        key: booking.bookingProductId,
        entity: {
          ftts_canceldate: dateTimeNow,
          ftts_cancelreason: cancelReasonCode,
        },
      };

      this.dynamicsWebApi.startBatch();

      const updateBookingRequest: UpdateRequest = {
        collection: 'ftts_bookings',
        key: booking.bookingId,
        entity: {
          ftts_bookingstatus: BookingStatus.CANCELLED,
          ftts_owedcompbookingassigned: dateTimeNow,
          ftts_callamend: isCustomerServiceCentreBooking ? 'true' : 'false', // Allows us to bypass CRM Restrictions on CSC Bookings and update the booking.
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.dynamicsWebApi.updateRequest(updateBookingRequest);

      if (updatedTCN) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        updateBookingProductRequest.entity!.ftts_tcn_update_date = dateTimeNow;
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.dynamicsWebApi.updateRequest(updateBookingProductRequest);

      if (booking.financeTransactionStatus === FinanceTransactionStatus.RECOGNISED) {
        const updateFinanceTransactionRequest: UpdateRequest = {
          collection: 'ftts_financetransactions',
          key: booking.financeTransactionId,
          entity: {
            ftts_owedcompensationrecognised: false,
            ftts_owedcompensationbookingdate: dateTimeNow,
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.dynamicsWebApi.updateRequest(updateFinanceTransactionRequest);
        logger.debug(`CrmClient::markBookingAsCompensated:: Attempting to update booking, booking product and finance transaction for ${booking.bookingReference}`, {
          updateBookingRequest,
          updateBookingProductRequest,
          updateFinanceTransactionRequest,
        });
      } else {
        logger.debug(`CrmClient::markBookingAsCompensated:: Attempting to update booking and booking product for ${booking.bookingReference}`, {
          updateBookingRequest,
          updateBookingProductRequest,
        });
      }
      await this.dynamicsWebApi.executeBatch();
      logger.debug(`CrmClient::markBookingAsCompensated:: Sucessfully updated ${booking.bookingReference} in CRM`);
    } catch (error) {
      logger.error(error, 'CrmClient::markBookingAsCompensated: Error updating CRM', {
        ...getBookingIdentifiers(booking),
      });
      throw error;
    }
  }

  private async fetchRecordsPageByPage<T>(collection: Collection, xmlQuery: string): Promise<T[]> {
    const records: T[] = [];
    let nextPage: number | undefined = 1;
    while (nextPage) {
      // Disabled as we can't parallelise here - we are dependent on each page number
      // eslint-disable-next-line no-await-in-loop
      const response: DynamicsWebApi.FetchXmlResponse<T> = await this.dynamicsWebApi.fetch(
        collection, xmlQuery, undefined, nextPage,
      );
      logger.debug(`CrmClient::fetchRecordsPageByPage: Page ${nextPage} raw response`, { response });
      if (response.value) {
        records.push(...response.value);
      }
      nextPage = response.PagingInfo?.nextPage;
    }
    return records;
  }
}
