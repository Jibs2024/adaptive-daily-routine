// Single global trap - this app never opens more than one modal at a time,
// so there's no need for a stack.
let active = null;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
}

function handleKeydown(e) {
  if (!active) return;
  if (e.key === 'Escape' && active.onEscape) {
    active.onEscape();
    return;
  }
  if (e.key !== 'Tab') return;

  const focusable = getFocusable(active.container);
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!focusable.includes(document.activeElement)) {
    // Focus somehow ended up outside the trap (e.g. content re-rendered
    // mid-tab) - pull it back in rather than letting it escape.
    e.preventDefault();
    first.focus();
  }
}

document.addEventListener('keydown', handleKeydown);

// Call once when a modal opens. Re-renders of its content while it stays
// open should NOT call this again - the Tab handler re-queries focusable
// elements live, so it adapts on its own without re-grabbing focus.
export function trapFocus(container, { onEscape } = {}) {
  active = { container, previouslyFocused: document.activeElement, onEscape };
  const focusable = getFocusable(container);
  if (focusable.length > 0) focusable[0].focus();
}

export function releaseFocus() {
  if (!active) return;
  const { previouslyFocused } = active;
  active = null;
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus();
  }
}
