function checklistBadge(row) {
  if (!row.checklist) return '';
  const allItems = row.checklist.content.flatMap((group) => (group && Array.isArray(group.items) ? group.items : []));
  const total = allItems.length;
  const done = allItems.filter((item) => item.checked).length;
  if (done === 0) return '';
  const check = done === total ? '✓ ' : '';
  const label = done === total ? `All ${total} items checked` : `${done} of ${total} items checked`;
  return `<span class="check-badge" aria-label="${label}">${check}${done}/${total}</span>`;
}

export function renderScheduleRow(row, index, scheduleEditMode) {
  const deleteBtn = scheduleEditMode
    ? `<button class="row-delete-btn" data-index="${index}" aria-label="Delete ${row.title} row">×</button>`
    : '';
  return `
    <div class="row ${row.isAnchor ? 'anchor' : ''}" data-index="${index}" role="button" tabindex="0" aria-label="${row.title}, ${row.time}">
      <div class="time">${row.time}</div>
      <div class="activity">
        <div class="activity-title">${row.title} <span class="tap-hint" aria-hidden="true">›</span>${checklistBadge(row)}</div>
        ${row.note ? `<span class="note">${row.note}</span>` : ''}
      </div>
      ${deleteBtn}
    </div>
  `;
}

export function renderSchedule(container, rows, mode, scheduleEditMode = false) {
  container.className = 'mode-' + mode;
  container.innerHTML = rows.map((row, i) => renderScheduleRow(row, i, scheduleEditMode)).join('');
}
