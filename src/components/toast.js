let hideTimer = null;

export function showToast(els, message, onUndo) {
  clearTimeout(hideTimer);
  els.message.textContent = message;
  els.el.classList.add('open');
  els.undoBtn.onclick = () => {
    onUndo();
    hideToast(els);
  };
  hideTimer = setTimeout(() => hideToast(els), 5000);
}

export function hideToast(els) {
  clearTimeout(hideTimer);
  els.el.classList.remove('open');
}
