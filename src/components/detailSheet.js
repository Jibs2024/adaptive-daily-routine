function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hasStaticContent(row) {
  return row.detailType === 'reference' || row.detailType === 'plan';
}

function renderChecklistItem(item, groupIdx, itemIdx, editMode) {
  const control = editMode
    ? `<button class="checklist-remove" data-group="${groupIdx}" data-idx="${itemIdx}" aria-label="Remove item">×</button>`
    : `<input type="checkbox" ${item.checked ? 'checked' : ''} data-group="${groupIdx}" data-idx="${itemIdx}" aria-label="${item.name}">`;
  return `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" data-group="${groupIdx}" data-idx="${itemIdx}">
      ${control}
      <div class="checklist-item-text">
        <div class="checklist-item-head">
          <span class="checklist-name">${item.name}</span>
          ${item.dose ? `<span class="checklist-dose">${item.dose}</span>` : ''}
        </div>
        ${item.cue ? `<div class="checklist-cue">${item.cue}</div>` : ''}
      </div>
    </div>
  `;
}

function renderAddRow(groupIdx, isAdding) {
  if (!isAdding) {
    return `<button class="add-item-btn" data-group="${groupIdx}">+ Add item</button>`;
  }
  return `
    <div class="add-item-row">
      <input type="text" class="add-item-input" data-group="${groupIdx}" placeholder="New item name" aria-label="New item name">
      <button class="add-item-confirm" data-group="${groupIdx}">Add</button>
    </div>
  `;
}

function renderChecklistGroup(group, groupIdx, editState) {
  const items = group.items
    .map((item, itemIdx) => renderChecklistItem(item, groupIdx, itemIdx, editState.editMode))
    .join('');
  const addRow = editState.editMode ? renderAddRow(groupIdx, editState.addingToGroup === groupIdx) : '';
  // An emptied-out section (all items removed) shows no header while just
  // viewing - nothing left to label. In edit mode the header stays, since
  // it's still needed context for the "+ Add item" affordance below it.
  const showSectionHeader = group.section && (group.items.length > 0 || editState.editMode);
  return `
    <div class="checklist-group">
      ${showSectionHeader ? `<div class="checklist-section">${group.section}</div>` : ''}
      ${items}
      ${addRow}
    </div>
  `;
}

function wireChecklistEvents(bodyEl, editState, handlers) {
  if (editState.editMode) {
    bodyEl.querySelectorAll('.checklist-remove').forEach((btn) => {
      btn.addEventListener('click', () => handlers.onRemoveItem(Number(btn.dataset.group), Number(btn.dataset.idx)));
    });
    bodyEl.querySelectorAll('.add-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => handlers.onStartAdd(Number(btn.dataset.group)));
    });
    bodyEl.querySelectorAll('.add-item-confirm').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = bodyEl.querySelector(`.add-item-input[data-group="${btn.dataset.group}"]`);
        handlers.onAddItem(Number(btn.dataset.group), input.value);
      });
    });
    bodyEl.querySelectorAll('.add-item-input').forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handlers.onAddItem(Number(input.dataset.group), input.value);
        }
      });
      input.focus();
    });
  } else {
    bodyEl.querySelectorAll('.checklist-item').forEach((el) => {
      el.addEventListener('click', () => handlers.onToggleCheck(Number(el.dataset.group), Number(el.dataset.idx)));
    });
  }
}

function renderBody(bodyEl, row, editState, handlers) {
  const staticContent = hasStaticContent(row);
  const checklist = !!row.checklist;
  // Rows whose content is derived from the day of week (e.g. a weekly
  // training split) aren't eligible for manual checklist assign/remove -
  // that would create an ambiguous "remove it just for today, or forever?"
  const weeklyManaged = !!row.weeklySchedule;

  if (!staticContent && !checklist) {
    bodyEl.innerHTML = `
      <p class="empty-detail-text">This task doesn't have any detail content yet.</p>
      <button class="assign-checklist-btn">+ Add a checklist</button>
    `;
    bodyEl.querySelector('.assign-checklist-btn').addEventListener('click', handlers.onAssignChecklist);
    return;
  }

  let html = '';

  if (staticContent) {
    html += editState.editMode
      ? `<textarea class="static-content-editor" rows="8" aria-label="Edit ${row.title} content">${escapeHtml(row.detailContent)}</textarea>`
      : row.detailContent
          .split('\n\n')
          .map((p) => `<p>${p}</p>`)
          .join('');
  }

  if (checklist) {
    html += `<div class="checklist-wrapper">${row.checklist.content
      .map((group, groupIdx) => renderChecklistGroup(group, groupIdx, editState))
      .join('')}</div>`;
  } else if (editState.editMode && !weeklyManaged) {
    html += `<button class="assign-checklist-btn">+ Add a checklist</button>`;
  }

  if (checklist && editState.editMode && !weeklyManaged) {
    html += `<button class="remove-checklist-btn">Remove checklist from this task</button>`;
  }

  bodyEl.innerHTML = html;

  if (checklist) wireChecklistEvents(bodyEl, editState, handlers);

  const assignBtn = bodyEl.querySelector('.assign-checklist-btn');
  if (assignBtn) assignBtn.addEventListener('click', handlers.onAssignChecklist);

  const removeBtn = bodyEl.querySelector('.remove-checklist-btn');
  if (removeBtn) removeBtn.addEventListener('click', handlers.onRemoveChecklist);

  if (staticContent && editState.editMode) {
    const textarea = bodyEl.querySelector('.static-content-editor');
    textarea.addEventListener('blur', () => handlers.onSaveStaticContent(textarea.value));
  }
}

export function renderDetailSheet(els, row, editState, handlers) {
  els.title.textContent = row.title;
  els.time.textContent = row.time + (row.isAnchor ? ' · fixed anchor' : '');
  renderBody(els.body, row, editState, handlers);
  els.backdrop.classList.add('open');
  els.sheet.classList.add('open');
}

export function refreshDetailSheetBody(els, row, editState, handlers) {
  renderBody(els.body, row, editState, handlers);
}

export function getPendingStaticContentEdit(els) {
  const textarea = els.body.querySelector('.static-content-editor');
  return textarea ? textarea.value : null;
}

export function closeDetailSheet(els) {
  els.backdrop.classList.remove('open');
  els.sheet.classList.remove('open');
}
