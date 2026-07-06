function checklistBadge(row) {
  if (row.detailType !== 'checklist') return '';
  const total = row.detailContent.length;
  const done = row.detailContent.filter((item) => item.checked).length;
  if (done === 0 || done < total) return '';
  return `<span class="check-badge">✓ ${done}/${total}</span>`;
}

export function renderScheduleRow(row, index) {
  return `
    <div class="row ${row.isAnchor ? 'anchor' : ''}" data-index="${index}">
      <div class="time">${row.time}</div>
      <div class="activity">
        <div class="activity-title">${row.title} ${row.detailType ? '<span class="tap-hint">›</span>' : ''}${checklistBadge(row)}</div>
        ${row.note ? `<span class="note">${row.note}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderSchedule(container, rows, mode) {
  container.className = 'mode-' + mode;
  container.innerHTML = rows.map(renderScheduleRow).join('');
}
