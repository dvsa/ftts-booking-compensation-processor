import dedent from 'ts-dedent';

import { translate } from '../../../../../helpers/language';
import { asLocalTime, asFullDateWithWeekday } from '../../filters/local-date-time-filter';
import { formatAddressLines } from '../../helpers';
import { Target, TestType } from '../../../types/enums';
import { BookingCancellationDetails } from '../../../types';

export default {
  subject: 'DVA: Your driving theory test is CANCELLED',
  buildBody: async (details: BookingCancellationDetails, target: Target): Promise<string> => {
    const dvaInstructorTestTypes: TestType[] = [TestType.ADIP1DVA, TestType.AMIP1];
    let refundUrl = 'https://www.nidirect.gov.uk/services/change-or-cancel-your-theory-test-online';
    if (dvaInstructorTestTypes.includes(details.testType)) {
      refundUrl = 'https://www.nidirect.gov.uk/services/change-or-cancel-your-adi-or-ami-theory-test-online';
    }

    return dedent`
      # Your theory test is cancelled

      We are very sorry to inform you that your theory test has been cancelled. You can rebook a test at no extra cost or request a full refund. Please see below for more information.

      # Booking reference
      ${details.bookingRef}

      # Test Type
      ${await translate(`testTypes.${details.testType.toLowerCase()}`, target)}

      # Test time and date
      ${asLocalTime(details.testDateTime)} on ${asFullDateWithWeekday(details.testDateTime)}

      # Test location
      ${formatAddressLines(details.testCentre)}

      Unfortunately, the theory test you had booked is now cancelled.

      This is because ${details.reason}

      # What happens next

      You can book a replacement test online at [https://www.nidirect.gov.uk/services/book-your-theory-test-online](https://www.nidirect.gov.uk/services/book-your-theory-test-online)

      If you are a driving instructor use: [https://www.nidirect.gov.uk/services/book-your-adi-or-ami-theory-test-online](https://www.nidirect.gov.uk/services/book-your-adi-or-ami-theory-test-online)

      You can also call us to book a replacement test.
      Telephone: 0345 6006700

      # If you want a refund

      To request a refund for a cancelled test, you will need the booking reference above.

      You can request a refund online at: [${refundUrl}](${refundUrl})

      You can also call or email us to request a refund.

      [dva.theorycustomerserviceni@dvsa.gov.uk](mailto:dva.theorycustomerserviceni@dvsa.gov.uk)
      Telephone: 0345 6006700
      Monday to Friday, 8am to 4pm (except public holidays)
    `;
  },
};
