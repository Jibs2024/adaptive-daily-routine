const PREFIX = 'modelog:';

function dateKey(date) {
  return PREFIX + date.toISOString().slice(0, 10);
}

export function logMode(mode, date = new Date()) {
  localStorage.setItem(dateKey(date), mode);
}

export function getMode(date) {
  return localStorage.getItem(dateKey(date));
}

export function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
      mode: getMode(d),
    });
  }
  return days;
}
