function renderChecklistItem(item, groupIdx, itemIdx) {
  return `
    <div class="checklist-item ${item.checked ? 'checked' : ''}" data-group="${groupIdx}" data-idx="${itemIdx}">
      <input type="checkbox" ${item.checked ? 'checked' : ''} data-group="${groupIdx}" data-idx="${itemIdx}">
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

function renderBody(bodyEl, row, onToggleCheck) {
  if (row.detailType === 'checklist') {
    bodyEl.innerHTML = row.detailContent
      .map(
        (group, groupIdx) => `
      <div class="checklist-group">
        ${group.section ? `<div class="checklist-section">${group.section}</div>` : ''}
        ${group.items.map((item, itemIdx) => renderChecklistItem(item, groupIdx, itemIdx)).join('')}
      </div>
    `
      )
      .join('');
    bodyEl.querySelectorAll('.checklist-item').forEach((el) => {
      el.addEventListener('click', () => onToggleCheck(Number(el.dataset.group), Number(el.dataset.idx)));
    });
  } else {
    bodyEl.innerHTML = row.detailContent
      .split('\n\n')
      .map((p) => `<p>${p}</p>`)
      .join('');
  }
}

export function renderDetailSheet(els, row, onToggleCheck) {
  els.title.textContent = row.title;
  els.time.textContent = row.time + (row.isAnchor ? ' · fixed anchor' : '');
  renderBody(els.body, row, onToggleCheck);
  els.backdrop.classList.add('open');
  els.sheet.classList.add('open');
}

export function refreshDetailSheetBody(els, row, onToggleCheck) {
  renderBody(els.body, row, onToggleCheck);
}

export function closeDetailSheet(els) {
  els.backdrop.classList.remove('open');
  els.sheet.classList.remove('open');
}
