const PARTIAL_DEADLINE_ERROR = 'Choose both a deadline date and time, or leave both blank.'
const INVALID_DEADLINE_ERROR = 'Enter a valid deadline date and time.'

const pad = (value) => String(value).padStart(2, '0')

function utcTimestamp(year, month, day, hour, minute) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, 0, 0)
  return date.getTime()
}

function fieldsInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]))
}

function dateInTimezone(year, month, day, hour, minute, timeZone) {
  const wantedTimestamp = utcTimestamp(year, month, day, hour, minute)
  let timestamp = wantedTimestamp

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const fields = fieldsInTimezone(new Date(timestamp), timeZone)
    const displayedTimestamp = utcTimestamp(
      fields.year,
      fields.month,
      fields.day,
      fields.hour,
      fields.minute,
    )
    const adjustment = wantedTimestamp - displayedTimestamp
    timestamp += adjustment
    if (adjustment === 0) break
  }

  return new Date(timestamp)
}

export function deadlineFieldsToIso(date, time) {
  const hasDate = date !== '' && date != null
  const hasTime = time !== '' && time != null

  if (!hasDate && !hasTime) return { deadline: null, error: '' }
  if (!hasDate || !hasTime) {
    return { deadline: null, error: PARTIAL_DEADLINE_ERROR }
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeParts = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateParts || !timeParts) {
    return { deadline: null, error: INVALID_DEADLINE_ERROR }
  }

  const [, yearText, monthText, dayText] = dateParts
  const [, hourText, minuteText] = timeParts
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const localDate = new Date(year, month - 1, day, hour, minute)

  const timezoneOverride = typeof process !== 'undefined' ? process.env?.TZ : undefined
  const localTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone
  const dateToSerialize =
    timezoneOverride && timezoneOverride !== localTimezone
      ? dateInTimezone(year, month, day, hour, minute, timezoneOverride)
      : localDate
  const dateFields =
    timezoneOverride && timezoneOverride !== localTimezone
      ? fieldsInTimezone(dateToSerialize, timezoneOverride)
      : null

  if (
    (dateFields
      ? dateFields.year !== year ||
        dateFields.month !== month ||
        dateFields.day !== day ||
        dateFields.hour !== hour ||
        dateFields.minute !== minute
      : localDate.getFullYear() !== year ||
        localDate.getMonth() !== month - 1 ||
        localDate.getDate() !== day ||
        localDate.getHours() !== hour ||
        localDate.getMinutes() !== minute)
  ) {
    return { deadline: null, error: INVALID_DEADLINE_ERROR }
  }

  return { deadline: dateToSerialize.toISOString(), error: '' }
}

export function deadlineToLocalFields(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: '', time: '' }

  return {
    date: `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

export function localDateKey(date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
