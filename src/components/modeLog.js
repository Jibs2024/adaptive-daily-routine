import { formatDate, formatMode } from './exportModeLog.js';

export function renderModeLog(container, days) {
  container.innerHTML = days
    .map(
      (d) => `
    <div class="log-day ${d.mode || ''}">
      <span class="d">${d.label}</span>
      ${d.mode ? (d.mode === 'full' ? 'Full' : 'Rec') : '—'}
    </div>
  `
    )
    .join('');
}

// entries come sorted oldest-first (for export order); show newest-first here.
export function renderFullHistory(container, entries) {
  if (entries.length === 0) {
    container.innerHTML = '<p class="history-empty">No history yet — it builds up as you log your daily mode.</p>';
    return;
  }
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted
    .map(
      (e) => `
    <div class="history-row">
      <span class="history-date">${formatDate(e.date)}</span>
      <span class="history-mode ${e.mode}">${formatMode(e.mode)}</span>
    </div>
  `
    )
    .join('');
}
