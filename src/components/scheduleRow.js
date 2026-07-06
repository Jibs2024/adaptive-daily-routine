export function renderScheduleRow(row, index) {
  return `
    <div class="row ${row.isAnchor ? 'anchor' : ''}" data-index="${index}">
      <div class="time">${row.time}</div>
      <div class="activity">
        <div class="activity-title">${row.title} ${row.detailType ? '<span class="tap-hint">›</span>' : ''}</div>
        ${row.note ? `<span class="note">${row.note}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderSchedule(container, rows, mode) {
  container.className = 'mode-' + mode;
  container.innerHTML = rows.map(renderScheduleRow).join('');
}
