function renderChecklistItem(item, groupIdx, itemIdx, editMode) {
  const control = editMode
    ? `<button class="checklist-remove" data-group="${groupIdx}" data-idx="${itemIdx}" aria-label="Remove item">×</button>`
    : `<input type="checkbox" ${item.checked ? 'checked' : ''} data-group="${groupIdx}" data-idx="${itemIdx}">`;
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
      <input type="text" class="add-item-input" data-group="${groupIdx}" placeholder="New item name">
      <button class="add-item-confirm" data-group="${groupIdx}">Add</button>
    </div>
  `;
}

function renderChecklistGroup(group, groupIdx, editState) {
  const items = group.items
    .map((item, itemIdx) => renderChecklistItem(item, groupIdx, itemIdx, editState.editMode))
    .join('');
  const addRow = editState.editMode ? renderAddRow(groupIdx, editState.addingToGroup === groupIdx) : '';
  return `
    <div class="checklist-group">
      ${group.section ? `<div class="checklist-section">${group.section}</div>` : ''}
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
    const removeChecklistBtn = bodyEl.querySelector('.remove-checklist-btn');
    if (removeChecklistBtn) removeChecklistBtn.addEventListener('click', handlers.onRemoveChecklist);
  } else {
    bodyEl.querySelectorAll('.checklist-item').forEach((el) => {
      el.addEventListener('click', () => handlers.onToggleCheck(Number(el.dataset.group), Number(el.dataset.idx)));
    });
  }
}

function renderBody(bodyEl, row, editState, handlers) {
  if (row.detailType === 'checklist') {
    const groupsHtml = row.detailContent
      .map((group, groupIdx) => renderChecklistGroup(group, groupIdx, editState))
      .join('');
    const removeChecklistHtml = editState.editMode
      ? `<button class="remove-checklist-btn">Remove checklist from this task</button>`
      : '';
    bodyEl.innerHTML = groupsHtml + removeChecklistHtml;
    wireChecklistEvents(bodyEl, editState, handlers);
  } else if (!row.detailType) {
    bodyEl.innerHTML = `
      <p class="empty-detail-text">This task doesn't have any detail content yet.</p>
      <button class="assign-checklist-btn">+ Add a checklist</button>
    `;
    bodyEl.querySelector('.assign-checklist-btn').addEventListener('click', handlers.onAssignChecklist);
  } else {
    bodyEl.innerHTML = row.detailContent
      .split('\n\n')
      .map((p) => `<p>${p}</p>`)
      .join('');
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

export function closeDetailSheet(els) {
  els.backdrop.classList.remove('open');
  els.sheet.classList.remove('open');
}
