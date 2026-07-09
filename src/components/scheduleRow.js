import { parseDisplayTime, format24hTime } from '../timeUtils.js';

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

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

function renderRowEditForm(row, index) {
  const timeValue = format24hTime(parseDisplayTime(row.time));
  return `
    <div class="row-edit-form" data-index="${index}">
      <input type="time" class="row-edit-time" value="${timeValue}" aria-label="Edit time">
      <input type="text" class="row-edit-title" value="${escapeAttr(row.title)}" aria-label="Edit title">
      <div class="row-edit-actions">
        <button class="row-edit-cancel-btn" data-index="${index}">Cancel</button>
        <button class="row-edit-save-btn" data-index="${index}">Save</button>
      </div>
    </div>
  `;
}

export function renderScheduleRow(row, index, scheduleEditMode, editingRowIndex) {
  if (scheduleEditMode && index === editingRowIndex) {
    return renderRowEditForm(row, index);
  }
  const editBtn = scheduleEditMode
    ? `<button class="row-edit-btn" data-index="${index}" aria-label="Edit ${row.title} row">✎</button>`
    : '';
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
      ${editBtn}
      ${deleteBtn}
    </div>
  `;
}

export function renderSchedule(container, rows, mode, scheduleEditMode = false, isCustom = false, editingRowIndex = null) {
  container.className = 'mode-' + mode;
  // First real render replaces the initial loading skeleton - clear the
  // aria-busy/label that described that skeleton so screen readers don't
  // keep announcing "loading" once real content is showing.
  container.removeAttribute('aria-busy');
  container.removeAttribute('aria-label');
  if (rows.length === 0) {
    const addBtn = isCustom ? '<button class="empty-schedule-add-btn">+ Add a task</button>' : '';
    container.innerHTML = `
      <div class="empty-schedule">
        <p class="empty-schedule-text">This template has no tasks yet.</p>
        ${addBtn}
      </div>
    `;
    return;
  }
  container.innerHTML = rows.map((row, i) => renderScheduleRow(row, i, scheduleEditMode, editingRowIndex)).join('');
}
