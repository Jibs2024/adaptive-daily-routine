let hideTimer = null;

export function showToast(els, message, actionLabel, onAction) {
  clearTimeout(hideTimer);
  els.message.textContent = message;
  if (actionLabel) {
    els.undoBtn.textContent = actionLabel;
    els.undoBtn.style.display = '';
    els.undoBtn.onclick = () => {
      onAction();
      hideToast(els);
    };
  } else {
    els.undoBtn.style.display = 'none';
    els.undoBtn.onclick = null;
  }
  els.el.classList.add('open');
  hideTimer = setTimeout(() => hideToast(els), 5000);
}

export function hideToast(els) {
  clearTimeout(hideTimer);
  els.el.classList.remove('open');
}
