/**
 * 시각을 사람이 읽는 글자로 바꾸는 순수 함수들.
 *
 * `shared/component/Timestamp`를 지우면서(2026-09-18) 이리로 왔다 — Figma `01 Shared`가 컴포넌트
 * 목록이고 거기에 시각 컴포넌트가 없다. 표시할 자리를 아는 것은 부르는 쪽이라 글자만 돌려준다.
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value: number) => String(value).padStart(2, "0");

type DatetimeToken = "YYYY" | "MM" | "DD" | "HH" | "mm" | "ss";

const applyFormat = (tokens: Record<DatetimeToken, string>, format: string): string =>
  format.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token as DatetimeToken]);

const datetimeTokens = (date: Date): Record<DatetimeToken, string> => ({
  YYYY: String(date.getFullYear()),
  MM: pad(date.getMonth() + 1),
  DD: pad(date.getDate()),
  HH: pad(date.getHours()),
  mm: pad(date.getMinutes()),
  ss: pad(date.getSeconds()),
});

/** 로컬 시간대로 찍는다. 알 수 없는 토큰은 리터럴로 남는다. */
export const formatDateTime = (date: Date, format?: string): string =>
  applyFormat(datetimeTokens(date), format ?? "YYYY-MM-DD HH:mm");

/** `date`부터 `to`까지 지난 "만" 개월 수 — ms 차이를 30일로 나누는 근사 대신 달력
 * 필드(연·월·일)로 계산한다("1/31 → 3/1"처럼 달마다 일수가 달라도 직관과 맞도록). `to`의
 * 일(day-of-month)이 `date`보다 이르면 그 달이 아직 안 채워진 것이라 1을 뺀다 — "만 나이"
 * 계산과 같은 보정. */
const diffInCalendarMonths = (date: Date, to: Date): number => {
  const months = (to.getFullYear() - date.getFullYear()) * 12 + (to.getMonth() - date.getMonth());
  return to.getDate() < date.getDate() ? months - 1 : months;
};

/** 미래는 `방금`으로 접는다 — 시계가 어긋난 기기에서 "-3분 전"이 보이지 않게. */
export const formatRelative = (date: Date, now: number): string => {
  const diff = Math.max(0, now - date.getTime());
  if (diff < MINUTE) return "방금";
  if (diff < HOUR) return `${String(Math.floor(diff / MINUTE))}분 전`;
  if (diff < DAY) return `${String(Math.floor(diff / HOUR))}시간 전`;

  const months = Math.max(0, diffInCalendarMonths(date, new Date(now)));
  if (months < 1) return `${String(Math.floor(diff / DAY))}일 전`;
  if (months < 12) return `${String(months)}개월 전`;
  return `${String(Math.floor(months / 12))}년 전`;
};
