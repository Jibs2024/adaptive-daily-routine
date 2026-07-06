export function renderTemplatePicker(container, templates, currentId, onSelect) {
  container.innerHTML = templates
    .map(
      (t) => `
    <div class="template-btn ${t.id === currentId ? 'active' : ''}" data-id="${t.id}">
      ${t.label}<br><span style="opacity:.7">${t.sublabel || ''}</span>
    </div>
  `
    )
    .join('');
  container.querySelectorAll('.template-btn').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.id));
  });
}
