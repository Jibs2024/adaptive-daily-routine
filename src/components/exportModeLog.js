import { showToast } from './toast.js';

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMode(mode) {
  return mode === 'full' ? 'Full' : 'Recovery';
}

export function buildModeLogExportText(entries) {
  const exportedOn = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const lines = entries.map((e) => `${formatDate(e.date)}: ${formatMode(e.mode)}`);
  return `Adaptive Daily Routine — Mode Log\nExported ${exportedOn}\n\n${lines.join('\n')}`;
}

export async function shareModeLog(entries, toastEls) {
  if (entries.length === 0) {
    showToast(toastEls, 'Nothing to export yet', null, null);
    return;
  }

  const text = buildModeLogExportText(entries);

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Mode Log', text });
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Share failed:', err);
      showToast(toastEls, 'Could not share — try again', null, null);
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      showToast(toastEls, 'Copied to clipboard', null, null);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast(toastEls, 'Could not copy — try again', null, null);
    }
  }
}
