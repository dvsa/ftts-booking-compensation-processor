import { translate } from '../../../../../src/helpers/language';
import { ProductNumber } from '../../../../../src/services/crm/types/enums';
import { TestType, Target } from '../../../../../src/services/notification/types/enums';
import { buildCandidateBookingCancellationEmailContent, buildTrainerBookerBookingCancellationEmailContent } from '../../../../../src/services/notification/content/builders';
import { bookingsGroupedByBookedSlotId, jobDescriptor } from '../../../../stubs/trainer-booker-slots-grouped.mock';
import { TrainerBookerBooking } from '../../../../../src/services/crm/types/bookings';

describe('buildCandidateBookingCancellationEmailContent', () => {
  test.each([
    [ProductNumber.CAR, TestType.CAR],
    [ProductNumber.MOTORCYCLE, TestType.MOTORCYCLE],
    [ProductNumber.LGVMC, TestType.LGVMC],
    [ProductNumber.LGVHPT, TestType.LGVHPT],
    [ProductNumber.LGVCPC, TestType.LGVCPC],
    [ProductNumber.LGVCPCC, TestType.LGVCPCC],
    [ProductNumber.PCVMC, TestType.PCVMC],
    [ProductNumber.PCVHPT, TestType.PCVHPT],
    [ProductNumber.PCVCPC, TestType.PCVCPC],
    [ProductNumber.PCVCPCC, TestType.PCVCPCC],
    [ProductNumber.ADIP1, TestType.ADIP1],
    [ProductNumber.ADIHPT, TestType.ADIHPT],
    [ProductNumber.ADIP1DVA, TestType.ADIP1DVA],
    [ProductNumber.ERS, TestType.ERS],
    [ProductNumber.AMIP1, TestType.AMIP1],
    [ProductNumber.TAXI, TestType.TAXI],
  ])('mapping of testType to productNumber %s', async (productNumber, testType) => {
    const booking = {
      ftts_bookingproductid: 'a16f2bae-b1d4-eb11-bacb-000d3ad612c6', bookingProductReference: 'B-000-174-370-01', tcnName: 'Regional TCN-002', testCentreAddressPostCode: 'E14 7AF', bookingReference: 'B-000-174-370', testCentreId: 'abf6a7c8-937d-ea11-a811-00224801bc51', bookingId: 'dca49aaa-b1d4-eb11-bacb-000d3ad61b6a', candidateAddressCity: 'Some County', testCentreAddressCity: 'London', productNumber: ProductNumber.CAR, testCentreAddressLine2: '14 Thomas Road', testCentreAddressLine1: '3 Quebec Wharf', isNsaBooking: false, bookingStatus: 675030001, price: 23, candidateAddressLine4: 'Some City', candidateAddressLine3: 'Some Village', candidateAddressLine2: 'Some Town', candidateAddressLine1: '12 Another Street', candidateSurname: 'Williams', isTcnRegionC: false, candidateEmail: 'welcomehome@yopmail.com', candidateAddressPostcode: 'B2 1EE', bookingProductId: 'a16f2bae-b1d4-eb11-bacb-000d3ad612c6', isTcnRegionB: true, governmentAgency: 0, financeTransactionAmount: 23, isTcnRegionA: false, financeTransactionId: '2bb675e7-b1d4-eb11-bacb-000d3ad61b6a', testCentreRemit: 675030000, tcnId: 'fde8157f-e156-ea11-a811-000d3a7f128d', productId: 'da490f3e-2605-4c03-9d28-f935cf9ace5c', origin: 1, testDate: new Date('2021-07-01T00:15:00.000Z'), candidateId: 'e5afd76f-b0d4-eb11-bacb-000d3ad61115', candidateFirstnames: 'David', productName: 'Car test', testCentreName: 'Mile End', cancellationReason: 'something',
    };
    booking.productNumber = productNumber;

    const content = await buildCandidateBookingCancellationEmailContent(booking, Target.GB);
    const translation = await translate(`testTypes.${testType.toLowerCase()}`, Target.GB);

    expect(content.body).toMatch(translation);
  });
});

describe('buildTrainerBookerBookingCancellationEmailContent', () => {
  test('emails are built correctly', async () => {
    const emailContent = await buildTrainerBookerBookingCancellationEmailContent(
      bookingsGroupedByBookedSlotId as unknown as _.Dictionary<TrainerBookerBooking[]>,
      jobDescriptor,
    );

    expect(emailContent.subject).toEqual('DVSA: Driving theory tests CANCELLED');
    expect(emailContent.body).toHaveLength(5754);
  });
});
