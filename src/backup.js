// Full-app backup: unlike the mode-log text export, this captures every key
// this app writes to localStorage (templates, checklist state, overrides,
// mode log, selected template) so the whole app state can be restored on
// another device or after a reinstall - not just the mode-log history.
const BACKUP_VERSION = 1;

export function buildBackupJson() {
  const data = {};
  Object.keys(localStorage).forEach((key) => {
    data[key] = localStorage.getItem(key);
  });
  const backup = {
    format: 'adaptive-daily-routine-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

function isValidBackup(parsed) {
  return (
    parsed &&
    parsed.format === 'adaptive-daily-routine-backup' &&
    typeof parsed.version === 'number' &&
    parsed.data &&
    typeof parsed.data === 'object' &&
    !Array.isArray(parsed.data)
  );
}

// Restores a backup wholesale: clears everything currently in localStorage
// first, so keys that existed at export time but not in a stale key that
// would otherwise survive the restore unexpectedly.
export function restoreFromBackupJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('That file isn\'t valid JSON.');
  }
  if (!isValidBackup(parsed)) {
    throw new Error('That file doesn\'t look like an Adaptive Daily Routine backup.');
  }
  localStorage.clear();
  Object.entries(parsed.data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}
