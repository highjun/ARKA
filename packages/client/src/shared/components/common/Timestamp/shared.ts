import type { TimestampMode } from './Timestamp';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value: number) => String(value).padStart(2, '0');

type DatetimeToken = 'YYYY' | 'MM' | 'DD' | 'HH' | 'mm' | 'ss';

const applyFormat = (tokens: Partial<Record<DatetimeToken, string>>, format: string): string =>
  format.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token as DatetimeToken] ?? token);

const datetimeTokens = (date: Date): Record<DatetimeToken, string> => ({
  YYYY: String(date.getFullYear()),
  MM: pad(date.getMonth() + 1),
  DD: pad(date.getDate()),
  HH: pad(date.getHours()),
  mm: pad(date.getMinutes()),
  ss: pad(date.getSeconds()),
});

/** `duration` 전용 — 같은 토큰 이름을 경과 일/시/분/초로 재해석한다. `YYYY`/`MM`은 달력 계산이 필요해 뺀다(치환 안 됨 → 리터럴로 남음). */
const durationTokens = (diffMs: number): Partial<Record<DatetimeToken, string>> => {
  const totalSeconds = Math.floor(Math.max(0, diffMs) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  return {
    DD: pad(Math.floor(totalHours / 24)),
    HH: pad(totalHours % 24),
    mm: pad(totalMinutes % 60),
    ss: pad(totalSeconds % 60),
  };
};

export const formatDateTime = (date: Date, format?: string): string => applyFormat(datetimeTokens(date), format ?? 'YYYY-MM-DD HH:mm');

export const formatDuration = (diffMs: number, format?: string): string => applyFormat(durationTokens(diffMs), format ?? 'HH시간 mm분');

/** `date`부터 `to`까지 지난 "만" 개월 수 — ms 차이를 30일로 나누는 근사 대신 달력
 * 필드(연·월·일)로 계산한다("1/31 → 3/1"처럼 달마다 일수가 달라도 직관과 맞도록). `to`의
 * 일(day-of-month)이 `date`보다 이르면 그 달이 아직 안 채워진 것이라 1을 뺀다 — "만 나이"
 * 계산과 같은 보정. */
const diffInCalendarMonths = (date: Date, to: Date): number => {
  const months = (to.getFullYear() - date.getFullYear()) * 12 + (to.getMonth() - date.getMonth());
  return to.getDate() < date.getDate() ? months - 1 : months;
};

export const formatRelative = (date: Date, now: number): string => {
  const diff = Math.max(0, now - date.getTime());
  if (diff < MINUTE) return '방금';
  if (diff < HOUR) return `${String(Math.floor(diff / MINUTE))}분 전`;
  if (diff < DAY) return `${String(Math.floor(diff / HOUR))}시간 전`;

  const months = Math.max(0, diffInCalendarMonths(date, new Date(now)));
  if (months < 1) return `${String(Math.floor(diff / DAY))}일 전`;
  if (months < 12) return `${String(months)}개월 전`;
  return `${String(Math.floor(months / 12))}년 전`;
};

export const formatTimestamp = (mode: TimestampMode, date: Date, now: number, format?: string): string => {
  if (mode === 'relative') return formatRelative(date, now);
  if (mode === 'duration') return formatDuration(Math.max(0, now - date.getTime()), format);
  return formatDateTime(date, format);
};
