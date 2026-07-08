export function renderTemplatesList(container, templates, currentId, handlers) {
  container.innerHTML = templates
    .map(
      (t) => `
    <div class="template-list-item ${t.id === currentId ? 'active' : ''}" data-id="${t.id}" role="button" tabindex="0" aria-pressed="${t.id === currentId}" aria-label="Select ${t.label} template">
      <div class="template-list-info">
        <div class="template-list-name">${t.label}<span class="template-list-sublabel">${t.sublabel || ''}</span></div>
        ${t.description ? `<div class="template-list-desc">${t.description}</div>` : ''}
      </div>
      ${
        t.isCustom
          ? `<button class="template-delete-btn" data-id="${t.id}" aria-label="Delete ${t.label} template">×</button>`
          : ''
      }
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.template-list-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.template-delete-btn')) return;
      handlers.onSelect(el.dataset.id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.target.closest('.template-delete-btn')) return;
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
}
