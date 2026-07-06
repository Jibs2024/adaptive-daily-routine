export function renderModeToggle(container, currentMode, onSelect) {
  container.innerHTML = `
    <button id="btn-full" class="${currentMode === 'full' ? 'active' : ''}" data-mode="full">Full Mode</button>
    <button id="btn-recovery" class="${currentMode === 'recovery' ? 'active' : ''}" data-mode="recovery">Recovery</button>
  `;
  container.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.mode));
  });
}
