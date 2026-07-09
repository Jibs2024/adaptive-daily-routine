function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderRenameForm(t) {
  return `
    <div class="template-rename-form" data-id="${t.id}">
      <input type="text" class="template-rename-input" value="${escapeAttr(t.label)}" aria-label="Rename template">
      <div class="template-rename-actions">
        <button class="template-rename-cancel-btn" data-id="${t.id}">Cancel</button>
        <button class="template-rename-save-btn" data-id="${t.id}">Save</button>
      </div>
    </div>
  `;
}

export function renderTemplatesList(container, templates, currentId, renamingId, handlers) {
  container.innerHTML = templates
    .map((t) => {
      if (t.id === renamingId) {
        return `<div class="template-list-item renaming" data-id="${t.id}">${renderRenameForm(t)}</div>`;
      }
      return `
    <div class="template-list-item ${t.id === currentId ? 'active' : ''}" data-id="${t.id}" role="button" tabindex="0" aria-pressed="${t.id === currentId}" aria-label="Select ${t.label} template">
      <div class="template-list-info">
        <div class="template-list-name">${t.label}<span class="template-list-sublabel">${t.sublabel || ''}</span></div>
        ${t.description ? `<div class="template-list-desc">${t.description}</div>` : ''}
      </div>
      ${
        t.isCustom
          ? `<button class="template-rename-btn" data-id="${t.id}" aria-label="Rename ${t.label} template">✎</button>
             <button class="template-delete-btn" data-id="${t.id}" aria-label="Delete ${t.label} template">×</button>`
          : ''
      }
    </div>
  `;
    })
    .join('');

  container.querySelectorAll('.template-list-item[role="button"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.template-delete-btn') || e.target.closest('.template-rename-btn')) return;
      handlers.onSelect(el.dataset.id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.target.closest('.template-delete-btn') || e.target.closest('.template-rename-btn')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlers.onSelect(el.dataset.id);
      }
    });
  });
  container.querySelectorAll('.template-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onDelete(btn.dataset.id);
    });
  });
  container.querySelectorAll('.template-rename-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onStartRename(btn.dataset.id);
    });
  });
  container.querySelectorAll('.template-rename-save-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const form = btn.closest('.template-rename-form');
      const input = form.querySelector('.template-rename-input');
      handlers.onSaveRename(btn.dataset.id, input.value);
    });
  });
  container.querySelectorAll('.template-rename-cancel-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onCancelRename();
    });
  });
}
