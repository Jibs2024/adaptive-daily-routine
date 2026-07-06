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
