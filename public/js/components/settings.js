// settings.js - Workspace settings panel for theme and PWA install controls

window.renderSettings = function(container, store) {
  if (!container) return;

  const activeTheme = store.getTheme();
  const installState = window.crmGetInstallState ? window.crmGetInstallState() : { canInstall: false, isInstalled: false };

  container.innerHTML = `
    <div class="settings-layout">
      <section class="glass-panel settings-section">
        <div class="settings-section-header">
          <div class="settings-icon icon-blue"><i data-lucide="palette"></i></div>
          <div>
            <h2>Theme</h2>
            <span>Workspace appearance</span>
          </div>
        </div>
        <div class="theme-choice-group" role="group" aria-label="Theme mode">
          <button type="button" class="theme-choice ${activeTheme === "dark" ? "active" : ""}" data-theme-choice="dark">
            <i data-lucide="moon"></i>
            <span>Dark</span>
          </button>
          <button type="button" class="theme-choice ${activeTheme === "light" ? "active" : ""}" data-theme-choice="light">
            <i data-lucide="sun"></i>
            <span>Light</span>
          </button>
        </div>
      </section>

      <section class="glass-panel settings-section">
        <div class="settings-section-header">
          <div class="settings-icon icon-green"><i data-lucide="monitor-down"></i></div>
          <div>
            <h2>Desktop App</h2>
            <span id="install-app-status">${installState.isInstalled ? "Installed" : installState.canInstall ? "Ready" : "Available"}</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary settings-install-btn" id="btn-install-desktop-app" ${installState.isInstalled ? "disabled" : ""}>
          <i data-lucide="${installState.isInstalled ? "check-circle" : "download"}"></i>
          <span>${installState.isInstalled ? "Desktop App Installed" : "Install Desktop App"}</span>
        </button>
      </section>
    </div>
  `;

  container.querySelectorAll("[data-theme-choice]").forEach(button => {
    button.addEventListener("click", async () => {
      const theme = button.getAttribute("data-theme-choice");
      if (!theme || theme === store.getTheme()) return;

      if (window.setCRMTheme) {
        await window.setCRMTheme(theme);
      } else {
        await store.setTheme(theme);
      }

      container.querySelectorAll("[data-theme-choice]").forEach(choice => {
        choice.classList.toggle("active", choice.getAttribute("data-theme-choice") === theme);
      });
    });
  });

  const installButton = document.getElementById("btn-install-desktop-app");
  const statusLabel = document.getElementById("install-app-status");

  function updateInstallState() {
    const state = window.crmGetInstallState ? window.crmGetInstallState() : { canInstall: false, isInstalled: false };
    if (!installButton || !statusLabel) return;

    installButton.disabled = state.isInstalled;
    statusLabel.textContent = state.isInstalled ? "Installed" : state.canInstall ? "Ready" : "Available";
    installButton.innerHTML = `
      <i data-lucide="${state.isInstalled ? "check-circle" : "download"}"></i>
      <span>${state.isInstalled ? "Desktop App Installed" : "Install Desktop App"}</span>
    `;
    lucide.createIcons();
  }

  installButton.addEventListener("click", async () => {
    if (window.crmInstallDesktopApp) {
      await window.crmInstallDesktopApp();
      updateInstallState();
    }
  });

  if (window.__abilixSettingsInstallListener) {
    window.removeEventListener("crm-pwa-install-state-changed", window.__abilixSettingsInstallListener);
  }
  window.__abilixSettingsInstallListener = updateInstallState;
  window.addEventListener("crm-pwa-install-state-changed", updateInstallState);

  lucide.createIcons();
};
