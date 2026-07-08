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

export function getAllModeLogEntries() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => ({ date: key.slice(PREFIX.length), mode: localStorage.getItem(key) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const CHECKLIST_PREFIX = 'checklist:';

function checklistKey(templateId, mode, rowId, scope) {
  const base = `${CHECKLIST_PREFIX}${templateId}:${mode}:${rowId}`;
  return scope === 'daily' ? `${base}:${new Date().toISOString().slice(0, 10)}` : base;
}

export function getChecklistState(templateId, mode, rowId, scope) {
  const raw = localStorage.getItem(checklistKey(templateId, mode, rowId, scope));
  return raw ? JSON.parse(raw) : null;
}

export function setChecklistState(templateId, mode, rowId, detailContent, scope) {
  localStorage.setItem(checklistKey(templateId, mode, rowId, scope), JSON.stringify(detailContent));
}
