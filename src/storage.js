const PREFIX = 'modelog:';

// Shared write guard: localStorage.setItem can throw (quota exceeded, private
// browsing with storage disabled, etc). Callers on funnel paths that matter
// to the user (checklist/template saves) check the return value and surface
// a visible toast rather than losing the edit silently.
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`Storage write failed for "${key}":`, err);
    return false;
  }
}

// Shared read guard: a corrupted or unexpectedly-shaped value under a key
// (e.g. from a future schema change, or a previous crash mid-write) would
// otherwise throw and take down the whole render path with it.
function safeParse(raw, key) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Storage read failed for "${key}":`, err);
    return null;
  }
}

function dateKey(date) {
  return PREFIX + date.toISOString().slice(0, 10);
}

export function logMode(mode, date = new Date()) {
  return safeSetItem(dateKey(date), mode);
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
  const key = checklistKey(templateId, mode, rowId, scope);
  const raw = localStorage.getItem(key);
  return raw ? safeParse(raw, key) : null;
}

export function setChecklistState(templateId, mode, rowId, detailContent, scope) {
  return safeSetItem(checklistKey(templateId, mode, rowId, scope), JSON.stringify(detailContent));
}

// Daily-reset checklist keys (Wind Down, Exercise's weekday-variant state,
// etc.) carry a trailing YYYY-MM-DD and accumulate one entry per day the
// checklist was used - deliberately NOT modelog: entries, which are the
// app's actual tracked history (the whole point of tracking mode is
// long-term pattern spotting, and the export feature depends on all of it).
export function cleanupOldDailyKeys(maxAgeDays = 90) {
  // Runs unconditionally on every app boot, before anything else has
  // rendered - a failure here (corrupted key, storage API unavailable)
  // must not block the rest of init().
  try {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(CHECKLIST_PREFIX)) return;
      const lastPart = key.slice(key.lastIndexOf(':') + 1);
      if (!datePattern.test(lastPart)) return;
      const keyTime = new Date(`${lastPart}T00:00:00Z`).getTime();
      if (!Number.isNaN(keyTime) && keyTime < cutoff) {
        localStorage.removeItem(key);
        removed++;
      }
    });

    return removed;
  } catch (err) {
    console.error('Storage cleanup failed:', err);
    return 0;
  }
}

const SELECTED_TEMPLATE_KEY = 'selectedTemplateId';

export function getSelectedTemplateId() {
  return localStorage.getItem(SELECTED_TEMPLATE_KEY);
}

export function setSelectedTemplateId(id) {
  return safeSetItem(SELECTED_TEMPLATE_KEY, id);
}

// Whether a checklist has been user-attached to a row (independent of
// whatever static reference/plan content that row might also have), or
// detached back off. Always indefinite regardless of the checklist's own
// persistChecklist scope, since this is a structural decision about the
// schedule's shape, not day-to-day checklist progress.
const TYPE_PREFIX = 'checklist-type:';

// Free-text edits to a row's static reference/plan content. Always
// indefinite - an edited meal plan or dhikr text is a durable
// customization, not something that should reset overnight.
const CONTENT_PREFIX = 'content:';

// Custom, user-created templates. Unlike built-in templates (static files,
// edits layered on top via the prefixes above), a custom template has no
// static original to diff against - the whole object lives in one key here,
// and any edit just re-saves the whole thing.
const CUSTOM_TEMPLATE_PREFIX = 'customTemplate:';

export function hasAnyPriorUsage() {
  return Object.keys(localStorage).some(
    (key) =>
      key.startsWith(PREFIX) ||
      key.startsWith(CHECKLIST_PREFIX) ||
      key.startsWith(TYPE_PREFIX) ||
      key.startsWith(CONTENT_PREFIX) ||
      key.startsWith(CUSTOM_TEMPLATE_PREFIX)
  );
}

function typeKey(templateId, mode, rowId) {
  return `${TYPE_PREFIX}${templateId}:${mode}:${rowId}`;
}

export function getTypeOverride(templateId, mode, rowId) {
  return localStorage.getItem(typeKey(templateId, mode, rowId));
}

export function setTypeOverride(templateId, mode, rowId, value) {
  return safeSetItem(typeKey(templateId, mode, rowId), value);
}

function contentKey(templateId, mode, rowId) {
  return `${CONTENT_PREFIX}${templateId}:${mode}:${rowId}`;
}

export function getRowText(templateId, mode, rowId) {
  return localStorage.getItem(contentKey(templateId, mode, rowId));
}

export function setRowText(templateId, mode, rowId, text) {
  return safeSetItem(contentKey(templateId, mode, rowId), text);
}

export function getCustomTemplateIds() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(CUSTOM_TEMPLATE_PREFIX))
    .map((key) => key.slice(CUSTOM_TEMPLATE_PREFIX.length));
}

export function getCustomTemplate(id) {
  const key = CUSTOM_TEMPLATE_PREFIX + id;
  const raw = localStorage.getItem(key);
  return raw ? safeParse(raw, key) : null;
}

export function saveCustomTemplate(id, data) {
  return safeSetItem(CUSTOM_TEMPLATE_PREFIX + id, JSON.stringify(data));
}

export function deleteCustomTemplate(id) {
  localStorage.removeItem(CUSTOM_TEMPLATE_PREFIX + id);
}
