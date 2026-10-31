import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const TIMEZONE = "America/New_York";

export const LEAVE_CUTOFF_MESSAGE =
  "Leave can only be requested up to an hour before the class starts.";

/**
 * Combine each scheduled date with the classroom start time and return the
 * earliest class start that is still in the future. Unlike the date-only
 * `getNextSession` on the frontend, a class that already started today is
 * not considered "next".
 */
export const getNextClassStart = (
  classroom: { schedule?: string[]; start?: { value: string } },
  now: Dayjs = dayjs().tz(TIMEZONE),
) => {
  if (!classroom?.start?.value) return undefined;

  return (classroom.schedule ?? [])
    .map((date) =>
      dayjs.tz(
        `${dayjs(date).tz(TIMEZONE).format("YYYY-MM-DD")} ${classroom.start!.value}`,
        "YYYY-MM-DD HH:mm",
        TIMEZONE,
      ),
    )
    .filter((start) => start.isAfter(now))
    .sort((a, b) => a.valueOf() - b.valueOf())[0];
};

export const isLeaveWindowOpen = (
  start: Dayjs | string,
  now: Dayjs = dayjs().tz(TIMEZONE),
) => now.isBefore(dayjs(start).subtract(1, "hour"));
