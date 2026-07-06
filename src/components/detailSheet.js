function renderBody(bodyEl, row, onToggleCheck) {
  if (row.detailType === 'checklist') {
    bodyEl.innerHTML = row.detailContent
      .map(
        (item, idx) => `
      <div class="checklist-item ${item.checked ? 'checked' : ''}" data-idx="${idx}">
        <input type="checkbox" ${item.checked ? 'checked' : ''} data-idx="${idx}">
        <span>${item.label}</span>
      </div>
    `
      )
      .join('');
    bodyEl.querySelectorAll('.checklist-item').forEach((el) => {
      el.addEventListener('click', () => onToggleCheck(Number(el.dataset.idx)));
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
