import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

import { config } from '../../../../config';

dayjs.extend(utc);
dayjs.extend(timezone);

export const asFullDateWithWeekday = localDateFormat('dddd D MMMM YYYY'); // "Tuesday 3 September 2020"
export const asLocalTime = localDateFormat('h:mma'); // "3:30pm" (GDS recommended format)

function localDateFormat(mask: string): (isoDate: string) => string {
  return (isoDate: string): string => dayjs(isoDate).tz(config.defaultTimeZone).format(mask);
}
