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

const SELECTED_TEMPLATE_KEY = 'selectedTemplateId';

export function getSelectedTemplateId() {
  return localStorage.getItem(SELECTED_TEMPLATE_KEY);
}

export function setSelectedTemplateId(id) {
  localStorage.setItem(SELECTED_TEMPLATE_KEY, id);
}

// Whether a row's detail type has been user-assigned (turned into a checklist,
// or a checklist removed back to plain). Always indefinite regardless of the
// row's own persistChecklist scope, since this is a structural decision about
// the schedule's shape, not day-to-day checklist progress.
const TYPE_PREFIX = 'checklist-type:';

export function hasAnyPriorUsage() {
  return Object.keys(localStorage).some(
    (key) => key.startsWith(PREFIX) || key.startsWith(CHECKLIST_PREFIX) || key.startsWith(TYPE_PREFIX)
  );
}

function typeKey(templateId, mode, rowId) {
  return `${TYPE_PREFIX}${templateId}:${mode}:${rowId}`;
}

export function getTypeOverride(templateId, mode, rowId) {
  return localStorage.getItem(typeKey(templateId, mode, rowId));
}

export function setTypeOverride(templateId, mode, rowId, value) {
  localStorage.setItem(typeKey(templateId, mode, rowId), value);
}
