function setStatus(key, ok, label) {
  document.getElementById('dot-' + key).classList.add(ok ? 'ok' : 'fail');
  document.getElementById('val-' + key).textContent = label;
}

// Service worker: register it, then reflect whether it actually took control.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => {
      if (navigator.serviceWorker.controller) {
        setStatus('sw', true, 'active');
      } else {
        // First load after registration — controller attaches next load.
        setStatus('sw', true, 'registered (reload to activate)');
      }
    })
    .catch((err) => {
      setStatus('sw', false, 'failed: ' + err.message);
    });
} else {
  setStatus('sw', false, 'not supported');
}

// Display mode: standalone/fullscreen means it was launched from a home-screen icon.
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
setStatus('installed', isStandalone, isStandalone ? 'standalone (installed)' : 'browser tab');

// Manifest: confirm the browser could find and parse it.
const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) {
  fetch(manifestLink.href)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status))))
    .then((data) => setStatus('manifest', true, data.name))
    .catch((err) => setStatus('manifest', false, 'failed: ' + err.message));
} else {
  setStatus('manifest', false, 'missing <link>');
}
