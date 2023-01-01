import fs from 'fs';

import { config } from '../../../config';
import { BookingStatus, Origin, FinanceTransactionType } from '../types/enums';

export class XmlQueryBuilder {
  constructor(
    private fileSystem = fs.promises,
  ) { }

  public async buildGetCandidateBookingsQuery(dateFrom: string, dateTo: string, testCentreIds?: string[]): Promise<string> {
    let xmlQuery = await this.readFile('get-candidate-bookings.xml');
    xmlQuery = xmlQuery
      .replace('{{recordsPerPage}}', config.crm.fetchRecordsPerPage)
      .replace('{{dateFrom}}', dateFrom)
      .replace('{{dateTo}}', dateTo)
      .replace('{{confirmedBookingStatus}}', String(BookingStatus.CONFIRMED))
      .replace('{{completedPassedBookingStatus}}', String(BookingStatus.COMPLETE_PASSED))
      .replace('{{completeFailedBookingStatus}}', String(BookingStatus.COMPLETE_FAILED))
      .replace('{{customerServiceCentreOrigin}}', String(Origin.CUSTOMER_SERVICES_CENTRE))
      .replace('{{candidateBookingPortalOrigin}}', String(Origin.CITIZEN_PORTAL))
      .replace('{{bookingFinanceTransactionType}}', String(FinanceTransactionType.BOOKING));
    return this.addFiltersToXml(xmlQuery, testCentreIds);
  }

  public async buildGetTrainerBookerBookingsQuery(dateFrom: string, dateTo: string, testCentreIds?: string[]): Promise<string> {
    let xmlQuery = await this.readFile('get-trainer-booker-bookings.xml');
    xmlQuery = xmlQuery
      .replace('{{recordsPerPage}}', config.crm.fetchRecordsPerPage)
      .replace('{{dateFrom}}', dateFrom)
      .replace('{{dateTo}}', dateTo)
      .replace('{{confirmedBookingStatus}}', String(BookingStatus.CONFIRMED))
      .replace('{{completedPassedBookingStatus}}', String(BookingStatus.COMPLETE_PASSED))
      .replace('{{completeFailedBookingStatus}}', String(BookingStatus.COMPLETE_FAILED))
      .replace('{{unassignedBookingStatus}}', String(BookingStatus.UNASSIGNED))
      .replace('{{assignedBookingStatus}}', String(BookingStatus.ASSIGNED))
      .replace('{{trainerBookerOrigin}}', String(Origin.TRAINER_BOOKER_PORTAL))
      .replace('{{expiredBookedSlotStatus}}', String(BookingStatus.EXPIRED));
    return this.addFiltersToXml(xmlQuery, testCentreIds);
  }

  private addFiltersToXml(xmlQuery: string, testCentreIds?: string[]): string {
    let updatedXmlQuery;
    if (testCentreIds) {
      const testCentreIdsFilter = this.buildMultiOrFilter('accountid', testCentreIds);
      updatedXmlQuery = xmlQuery.replace('{{testCentreIdsFilter}}', `<filter type="and">${testCentreIdsFilter}</filter>`);
    } else {
      updatedXmlQuery = xmlQuery.replace('{{testCentreIdsFilter}}', '');
    }
    return updatedXmlQuery;
  }

  private buildMultiOrFilter(attribute: string, filterValues: string[]): string {
    const conditions = filterValues.map((value) => `<condition attribute="${attribute}" operator="eq" value="${value}" />`);
    return `<filter type="or">${conditions.join('')}</filter>`;
  }

  private readFile(filename: string): Promise<string> {
    // Safe to disable - we control filename input
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return this.fileSystem.readFile(`./src/services/crm/queries/${filename}`, 'utf-8');
  }
}
