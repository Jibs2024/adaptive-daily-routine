// Parses a display time like "9:00pm" / "12:00pm" / "6:15am" into minutes since midnight (0-1439).
export function parseDisplayTime(str) {
  const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ap = match[3].toLowerCase();
  if (h === 12) h = 0;
  if (ap === 'pm') h += 12;
  return h * 60 + m;
}

// Parses a 24h "HH:MM" string (from <input type="time">) into minutes since midnight.
export function parse24hTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

// Formats minutes since midnight back into "9:00pm" display style.
export function formatDisplayTime(totalMinutes) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')}${ap}`;
}

// Formats minutes since midnight into "HH:MM" 24h style, for pre-filling
// <input type="time"> values (e.g. when opening a row for editing).
export function format24hTime(totalMinutes) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// A schedule day can start in the evening and wrap past midnight (e.g. Generic
// runs 10:00pm -> 6:00am -> ... -> 9:30pm). Raw clock minutes alone don't sort
// correctly across that wrap, so every time gets converted to "minutes elapsed
// since the schedule's own start row" before comparing.
function elapsedSince(rawMinutes, dayStart) {
  return rawMinutes >= dayStart ? rawMinutes - dayStart : rawMinutes + 1440 - dayStart;
}

// Finds the index at which to insert a new row with the given raw
// minutes-since-midnight time, keeping `rows` in correct chronological order.
export function findInsertionIndex(rows, newRawMinutes) {
  if (rows.length === 0) return 0;
  const dayStart = parseDisplayTime(rows[0].time);
  const newElapsed = elapsedSince(newRawMinutes, dayStart);
  for (let i = 0; i < rows.length; i++) {
    const rowElapsed = elapsedSince(parseDisplayTime(rows[i].time), dayStart);
    if (rowElapsed >= newElapsed) return i;
  }
  return rows.length;
}

// Inserts a new row into `rows` (mutating it) at its chronologically correct
// position, based on `newRow.time` ("9:00pm"-style display string).
export function insertRowByTime(rows, newRow) {
  const idx = findInsertionIndex(rows, parseDisplayTime(newRow.time));
  rows.splice(idx, 0, newRow);
  return idx;
}
