export function renderOnboarding(container, templates, onSelect) {
  container.innerHTML = templates
    .map(
      (t) => `
    <button class="onboarding-option" data-id="${t.id}">
      <span class="onboarding-option-label">${t.label}<span class="onboarding-option-sublabel">${t.sublabel || ''}</span></span>
      ${t.description ? `<div class="onboarding-option-desc">${t.description}</div>` : ''}
    </button>
  `
    )
    .join('');
  container.querySelectorAll('.onboarding-option').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.id));
  });
}
