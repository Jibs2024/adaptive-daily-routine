export function renderAnchorList(container, anchors, onRemove) {
  if (anchors.length === 0) {
    container.innerHTML = `<p class="builder-empty-text">No anchors added yet.</p>`;
    return;
  }
  container.innerHTML = anchors
    .map(
      (a, idx) => `
    <div class="builder-anchor-item">
      <span class="builder-anchor-time">${a.displayTime}</span>
      <span class="builder-anchor-label">${a.label}</span>
      <button class="builder-anchor-remove" data-idx="${idx}" aria-label="Remove ${a.label}">×</button>
    </div>
  `
    )
    .join('');
  container.querySelectorAll('.builder-anchor-remove').forEach((btn) => {
    btn.addEventListener('click', () => onRemove(Number(btn.dataset.idx)));
  });
}
