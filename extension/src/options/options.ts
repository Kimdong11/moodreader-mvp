document.addEventListener('DOMContentLoaded', async () => {
  const checkbox = document.getElementById('telemetry') as HTMLInputElement;
  const status = document.getElementById('status');

  // Load
  const data = await chrome.storage.local.get(['settings']);
  if (data.settings) {
    checkbox.checked = data.settings.telemetryEnabled !== false; // Default true
  }

  // Save
  checkbox.addEventListener('change', async () => {
    const data = await chrome.storage.local.get(['settings']);
    const settings = data.settings || {};
    settings.telemetryEnabled = checkbox.checked;
    await chrome.storage.local.set({ settings });
    
    if (status) {
      status.textContent = 'Saved.';
      setTimeout(() => { status.textContent = ''; }, 1500);
    }
  });
});
