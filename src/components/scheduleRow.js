function checklistBadge(row) {
  if (row.detailType !== 'checklist') return '';
  const allItems = row.detailContent.flatMap((group) => group.items);
  const total = allItems.length;
  const done = allItems.filter((item) => item.checked).length;
  if (done === 0) return '';
  const check = done === total ? '✓ ' : '';
  return `<span class="check-badge">${check}${done}/${total}</span>`;
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
