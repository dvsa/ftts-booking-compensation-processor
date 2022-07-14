import dedent from 'ts-dedent';

import { translate } from '../../../../../helpers/language';
import { asLocalTime, asFullDateWithWeekday } from '../../filters/local-date-time-filter';
import { formatAddressLines } from '../../helpers';
import { Target } from '../../../types/enums';
import { BookingCancellationDetails } from '../../../types';

export default {
  subject: 'DVSA: Driving theory tests CANCELLED',
  buildBody: async (
    details: BookingCancellationDetails[],
    cancellationReason: string,
    target: Target,
  ): Promise<string> => dedent`

    # Theory test cancellation

    Some driving theory test bookings made through your organisation have been cancelled and the fees refunded.

    ${cancellationReason}.

    The cancelled tests are listed below.

    # What you can do now

    1. Book replacement tests using the online theory test booking service https://www.gov.uk/book-pupil-theory-test.

    # Your responsibilities

    If cancelled tests had been assigned to candidates, your organisation must inform the candidates of the cancellation and offer a replacement test.

    ---

  `.concat(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    (await Promise.all(details.map(async (bookingCancellationDetails) => dedent`

      ^# Slot ID: ${bookingCancellationDetails.bookedSlotReference}
      Booking reference: ${bookingCancellationDetails.bookingRef}
      Test type: ${await translate(`testTypes.${bookingCancellationDetails.testType.toLowerCase()}`, target)}
      Test date: ${asLocalTime(bookingCancellationDetails.testDateTime)} on ${asFullDateWithWeekday(bookingCancellationDetails.testDateTime)}
      Test location: ${formatAddressLines(bookingCancellationDetails.testCentre)}

      ---
    `))).join(dedent`

    `),
  ),
};
