const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'history', label: 'History' },
  { id: 'templates', label: 'Templates' },
];

export function renderNavBar(container, currentView, onSelect) {
  container.innerHTML = VIEWS.map(
    (v) => `
    <button class="nav-btn ${v.id === currentView ? 'active' : ''}" data-view="${v.id}">
      ${v.label}
    </button>
  `
  ).join('');
  container.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.view));
  });
}
