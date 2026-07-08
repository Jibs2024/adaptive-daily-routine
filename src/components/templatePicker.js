export function renderTemplatePicker(container, templates, currentId, onSelect) {
  container.innerHTML = templates
    .map(
      (t) => `
    <button class="template-btn ${t.id === currentId ? 'active' : ''}" data-id="${t.id}" aria-pressed="${t.id === currentId}">
      ${t.label}<br><span style="opacity:.7">${t.sublabel || ''}</span>
    </button>
  `
    )
    .join('');
  container.querySelectorAll('.template-btn').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.id));
  });
}
