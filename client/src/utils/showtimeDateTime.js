export const SHOWTIME_TIME_ZONE = "Asia/Karachi";

const dateTimeParts = (value, timeZone = SHOWTIME_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
};

export const formatShowtime = (value, options = {}) =>
  new Intl.DateTimeFormat(undefined, {
    ...(hasIndividualDateTimeOptions(options)
      ? {}
      : { dateStyle: "medium", timeStyle: "short" }),
    timeZone: SHOWTIME_TIME_ZONE,
    ...options,
    hour12: true,
  }).format(new Date(value));

export const formatShowtimeDateKey = (dateKey, options = {}) =>
  new Intl.DateTimeFormat(undefined, {
    ...(hasIndividualDateTimeOptions(options) ? {} : { dateStyle: "medium" }),
    timeZone: SHOWTIME_TIME_ZONE,
    ...options,
  }).format(new Date(`${dateKey}T12:00:00+05:00`));

function hasIndividualDateTimeOptions(options) {
  return [
    "weekday",
    "era",
    "year",
    "month",
    "day",
    "dayPeriod",
    "hour",
    "minute",
    "second",
    "fractionalSecondDigits",
    "timeZoneName",
  ].some((key) => options[key] !== undefined);
}

export const formatShowtimeInput = (value) => {
  const parts = dateTimeParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const toShowtimeIso = (localValue) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!match) throw new Error("Enter a valid showtime date and time.");

  const [, year, month, day, hour, minute] = match;
  const wallClock = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  const offsetParts = dateTimeParts(new Date(wallClock));
  const offsetAsUtc = Date.UTC(
    +offsetParts.year,
    +offsetParts.month - 1,
    +offsetParts.day,
    +offsetParts.hour,
    +offsetParts.minute,
    +offsetParts.second,
  );
  return new Date(wallClock - (offsetAsUtc - wallClock)).toISOString();
};

export const getShowtimeDateKey = (date = new Date()) => {
  const parts = dateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const addDateKeyDays = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
