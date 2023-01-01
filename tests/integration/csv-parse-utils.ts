import { parse } from 'csv-string';

export const parseCsv = (csvString: string): Array<Record<string, string>> => {
  const records = parse(csvString);
  return records.map((row) => ({
    bookingReference: row[0],
    bookingProductReference: row[1],
    bookingDateTime: row[2],
    isNsaBooking: row[3],
    agency: row[4],
    testCentre: row[5],
    testCentreNetwork: row[6],
    candidateHasEmail: row[7],
  }));
};
