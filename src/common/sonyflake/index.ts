import dayJS from '../dayjs';
import { Sonyflake } from './sonyflake';

export const sonyflake = new Sonyflake({
  workerId: 0,
  epoch: dayJS.utc('2025-04-01').valueOf(),
});
