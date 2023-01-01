import dedent from 'ts-dedent';

import { translate } from '../../../../../helpers/language';
import { asLocalTime, asFullDateWithWeekday } from '../../filters/local-date-time-filter';
import { formatAddressLines } from '../../helpers';
import { Target } from '../../../types/enums';
import { BookingCancellationDetails } from '../../../types';

export default {
  buildBody: async (details: BookingCancellationDetails, target: Target): Promise<string> => dedent`
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

    You can book your replacement test online at GOV.UK: https://www.gov.uk/book-theory-test

    If you are a driving instructor use https://www.gov.uk/book-your-instructor-theory-test

    You can also call us to rebook a replacement test.
    Telephone: 0300 200 1122

    # If you want a refund

    To request a refund for a cancelled test, you will need the booking reference above.

    You can request a refund online at: https://www.gov.uk/change-theory-test

    If you are a driving instructor use: https://www.gov.uk/check-change-cancel-your-instructor-theory-test

    You can also call or email us to request a refund

    TheoryCustomerServices@dvsa.gov.uk
    Telephone: 0300 200 1122
    Monday to Friday, 8am to 4pm (except public holidays)
  `,
};
