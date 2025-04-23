import dayJS from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayJS.extend(weekday);
dayJS.extend(isoWeek);
dayJS.extend(utc);
dayJS.extend(timezone);
dayJS.extend(isBetween);
dayJS.extend(weekOfYear);
export default dayJS;
