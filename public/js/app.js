// app.js - Single Page Application Core Bootstrap & Orchestrator with Auth & CAPTCHA Controllers

// Initialize Global Core Services
window.CURRENCY_SYMBOL = "₹";
const store = new CRMStore();
let currentView = "dashboard";

const PIPELINE_COLOR_OPTIONS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" }
];

const LEGACY_STAGE_COLOR_MAP = {
  "var(--accent-indigo)": "#3b82f6",
  "var(--accent-emerald)": "#22c55e",
  "var(--accent-amber)": "#f59e0b",
  "var(--accent-crimson)": "#ef4444",
  "#818cf8": "#8b5cf6",
  "#a5b4fc": "#8b5cf6",
  "#6366f1": "#3b82f6",
  "#60a5fa": "#3b82f6",
  "#2dd4bf": "#14b8a6",
  "#c084fc": "#8b5cf6",
  "#f472b6": "#ec4899"
};

function normalizeStageColor(color) {
  if (!color) return "#3b82f6";
  const normalized = LEGACY_STAGE_COLOR_MAP[color] || color;
  return PIPELINE_COLOR_OPTIONS.some(option => option.value === normalized) ? normalized : "#3b82f6";
}

function renderStageColorOptions(activeColor) {
  const normalized = normalizeStageColor(activeColor);
  return PIPELINE_COLOR_OPTIONS
    .map(option => `<option value="${option.value}" ${option.value === normalized ? "selected" : ""}>${option.name}</option>`)
    .join("");
}

window.PIPELINE_COLOR_OPTIONS = PIPELINE_COLOR_OPTIONS;
window.normalizeStageColor = normalizeStageColor;

// DOM Elements cache
const mainViewport = document.getElementById("main-viewport");
const viewTitle = document.getElementById("view-title");
const sidebarNavItems = document.querySelectorAll(".sidebar-nav .nav-item");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const drawerOverlay = document.getElementById("drawer-overlay");
const contactDrawer = document.getElementById("contact-drawer");
const btnCloseDrawer = document.getElementById("btn-close-drawer");

// Auth Screen DOM Cache
const loginScreen = document.getElementById("login-screen");
const appContainer = document.querySelector(".app-container");
const loginForm = document.getElementById("login-form");
const btnLogout = document.getElementById("btn-logout");

// CAPTCHA verification variables
let currentCaptchaCode = "";

// --- View Router ---
async function navigateToView(viewId) {
  const user = store.getCurrentUser();
  if (!user) {
    checkAuthentication();
    return;
  }

  // RBAC Guard: Restrict non-admins from entering the User Management view
  if (viewId === "users" && user.role !== "admin") {
    navigateToView("dashboard");
    return;
  }

  currentView = viewId;

  // Clear sidebar active states
  sidebarNavItems.forEach(item => {
    if (item.getAttribute("data-view") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Close mobile sidebar if open
  sidebar.classList.remove("active");

  // Render view components
  switch (viewId) {
    case "dashboard":
      viewTitle.textContent = "Dashboard";
      renderDashboard(mainViewport, store, navigateToView);
      break;
    case "contacts":
      viewTitle.textContent = "Contacts & Leads";
      renderContacts(mainViewport, store);
      break;
    case "pipeline":
      viewTitle.textContent = "Sales Pipeline Board";
      renderPipeline(mainViewport, store);
      break;
    case "tasks":
      viewTitle.textContent = "Agenda Tasks";
      renderTasks(mainViewport, store);
      break;
    case "users":
      viewTitle.textContent = "User Account Management";
      containerLoadingState();
      const usersList = await store.getUsers();
      renderUsers(mainViewport, store, usersList);
      break;
    case "settings":
      viewTitle.textContent = "Settings";
      renderSettings(mainViewport, store);
      break;
    default:
      viewTitle.textContent = "Abilix CRM Dashboard";
      renderDashboard(mainViewport, store, navigateToView);
  }
}

// Temporary Loading State helper for async panels
function containerLoadingState() {
  mainViewport.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:300px;flex-direction:column;gap:12px;color:var(--text-secondary);">
      <div style="width:36px;height:36px;border:3px solid var(--border-color);border-top-color:var(--accent-indigo);border-radius:50%;animation:spin 1s linear infinite;"></div>
      <span style="font-size:13px;font-weight:500;">Loading secure workspace records...</span>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;
}



// --- Auth Guard and Bootstrapper ---
function checkAuthentication() {
  const user = store.getCurrentUser();
  if (!user) {
    // Hide App layout, show Login view
    appContainer.style.display = "none";
    loginScreen.style.display = "flex";
    loginScreen.classList.add("active");
    
    // Reset login form and generate a fresh CAPTCHA code
    loginForm.reset();
    generateCaptcha();
  } else {
    // Hide Login view, show App layout
    loginScreen.style.display = "none";
    loginScreen.classList.remove("active");
    appContainer.style.display = "flex";

    // Bind current user profile details
    document.getElementById("current-user-name").textContent = user.name;
    document.getElementById("current-user-role").textContent = user.role === 'admin' ? 'Administrator' : 'Sales Executive';
    
    const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById("current-user-avatar").textContent = initials;

    // Admin Sidebar Visibility Guard
    const usersNavItem = document.getElementById("nav-item-users");
    if (usersNavItem) {
      usersNavItem.style.display = user.role === 'admin' ? 'flex' : 'none';
    }

    // Dynamic stage select options in deal modal
    populateStageSelects();

    // Set Theme Scoped
    setupThemeManager();
  }
}

// --- Alphanumeric Canvas CAPTCHA Generator (High Security) ---
function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789"; // Distinguishable chars (no I, 1, O, 0)
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptchaCode = code;
  drawCaptcha();
}

function drawCaptcha() {
  const canvas = document.getElementById("captcha-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background styling matching glassmorphism card theme
  ctx.fillStyle = "rgba(22, 24, 35, 0.4)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add random slash noise lines
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.stroke();
  }

  // Alphanumeric text drawing with noise
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 20px 'Outfit', sans-serif";
  ctx.textBaseline = "middle";

  for (let i = 0; i < currentCaptchaCode.length; i++) {
    const char = currentCaptchaCode[i];
    const x = 12 + i * 22;
    const y = canvas.height / 2 + (Math.random() * 8 - 4);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() * 30 - 15) * Math.PI / 180);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  // Add ambient noise dots
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// --- Dynamic Modal Controls ---
function setupModalEvents() {
  const quickCreateBtn = document.getElementById("btn-quick-create");
  const quickCreateModal = document.getElementById("quick-create-modal");
  
  const contactModal = document.getElementById("contact-modal");
  const dealModal = document.getElementById("deal-modal");
  const taskModal = document.getElementById("task-modal");
  const userModal = document.getElementById("user-modal");

  // Show Quick Create Dialog
  quickCreateBtn.addEventListener('click', () => {
    quickCreateModal.classList.add("active");
  });

  // Small Quick cards select triggers
  document.getElementById("opt-new-contact").addEventListener('click', () => {
    quickCreateModal.classList.remove("active");
    openContactFormModal();
  });
  document.getElementById("opt-new-deal").addEventListener('click', () => {
    quickCreateModal.classList.remove("active");
    openDealFormModal();
  });
  document.getElementById("opt-new-task").addEventListener('click', () => {
    quickCreateModal.classList.remove("active");
    openTaskFormModal();
  });

  // Modal Closing binds on click triggers
  document.querySelectorAll(".modal-overlay, .btn-close-modal").forEach(el => {
    el.addEventListener('click', (e) => {
      // Ensure we only close on direct backdrop click or actual close button clicks
      if (e.target.classList.contains("modal-overlay") || e.target.closest(".btn-close-modal")) {
        const modal = e.target.closest(".modal-overlay");
        if (modal) modal.classList.remove("active");
      }
    });
  });

  // Populates selector dropdowns with latest contacts list
  function populateContactSelects(selectedContactId = "") {
    const list = store.getContacts();
    const dealContactSelect = document.getElementById("d-contact");
    const taskContactSelect = document.getElementById("t-contact");

    const placeholder = list.length > 0
      ? '<option value="" disabled selected>Select a contact</option>'
      : '<option value="" disabled selected>No contacts available</option>';
    const optionsHTML = placeholder + list
      .map(c => `<option value="${c.id}">${c.name}${c.company ? ` (${c.company})` : ""}</option>`)
      .join('');
    
    [dealContactSelect, taskContactSelect].forEach(select => {
      if (!select) return;
      select.innerHTML = optionsHTML;
      if (selectedContactId && list.some(c => c.id === selectedContactId)) {
        select.value = selectedContactId;
      }
    });
  }

  // Populates pipeline stages dynamically
  function populateStageSelects() {
    const stages = store.getPipelineStages();
    const dealStageSelect = document.getElementById("d-stage");
    if (dealStageSelect) {
      dealStageSelect.innerHTML = stages.length > 0
        ? stages.map(s => `<option value="${s.key}">${s.label}</option>`).join('')
        : '<option value="" disabled selected>No pipeline stages available</option>';
    }
  }

  // Forms open helpers
  function openContactFormModal() {
    document.getElementById("contact-form").reset();
    contactModal.classList.add("active");
  }

  function openDealFormModal(contactId = "") {
    document.getElementById("deal-form").reset();
    populateContactSelects(contactId);
    populateStageSelects();
    // Default targeted close date to 30 days out
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById("d-closedate").value = targetDate;
    dealModal.classList.add("active");
  }

  function openTaskFormModal(contactId = "") {
    document.getElementById("task-form").reset();
    populateContactSelects(contactId);
    // Default targeted due date to tomorrow
    const targetDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById("t-duedate").value = targetDate;
    taskModal.classList.add("active");
  }

  window.openContactFormModal = openContactFormModal;
  window.openDealFormModal = openDealFormModal;
  window.openTaskFormModal = openTaskFormModal;
  window.refreshCRMSelects = () => {
    populateContactSelects();
    populateStageSelects();
  };

  // Form Submissions Binds
  document.getElementById("contact-form").addEventListener('submit', async (e) => {
    e.preventDefault();
    const newContact = {
      name: document.getElementById("c-name").value.trim(),
      company: document.getElementById("c-company").value.trim(),
      email: document.getElementById("c-email").value.trim(),
      phone: document.getElementById("c-phone").value.trim(),
      stage: "Lead",
      value: parseFloat(document.getElementById("c-value").value) || 0,
      status: "Active"
    };

    await store.addContact(newContact);
    contactModal.classList.remove("active");
    navigateToView(currentView); // Refresh current viewport
    showToast("success", `Contact "${newContact.name}" added successfully.`);
  });

  document.getElementById("deal-form").addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDeal = {
      name: document.getElementById("d-name").value.trim(),
      value: parseFloat(document.getElementById("d-value").value) || 0,
      closeDate: document.getElementById("d-closedate").value,
      contactId: document.getElementById("d-contact").value,
      stage: document.getElementById("d-stage").value
    };

    if (!newDeal.contactId) {
      showToast("warning", "Please select an associated contact.");
      return;
    }
    if (!newDeal.stage) {
      showToast("warning", "Please add at least one pipeline stage.");
      return;
    }

    await store.addDeal(newDeal);
    dealModal.classList.remove("active");
    navigateToView(currentView); // Refresh
    showToast("success", `Sales Deal "${newDeal.name}" logged successfully.`);
  });

  document.getElementById("task-form").addEventListener('submit', async (e) => {
    e.preventDefault();
    const newTask = {
      title: document.getElementById("t-title").value.trim(),
      dueDate: document.getElementById("t-duedate").value,
      priority: document.getElementById("t-priority").value,
      contactId: document.getElementById("t-contact").value
    };

    if (!newTask.contactId) {
      showToast("warning", "Please select an associated contact.");
      return;
    }

    await store.addTask(newTask);
    taskModal.classList.remove("active");
    navigateToView(currentView); // Refresh
    showToast("success", `Agenda Task "${newTask.title}" scheduled.`);
  });

  // Admin New Account creation
  document.getElementById("user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("u-name").value.trim();
    const username = document.getElementById("u-username").value.trim().toLowerCase();
    const password = document.getElementById("u-password").value;
    const role = document.getElementById("u-role").value;

    const newUser = await store.addUser({ name, username, password, role });
    if (!newUser) {
      showToast("warning", `Account creation failed. Username "@${username}" is already taken!`);
      return;
    }

    userModal.classList.remove("active");
    document.getElementById("user-form").reset();
    
    // Refresh User management grid if open
    if (currentView === "users") {
      const freshUsers = await store.getUsers();
      renderUsers(mainViewport, store, freshUsers);
    }
    
    showToast("success", `User account for "${name}" registered successfully.`);
  });
}

// Populates stage select dynamically (exposed helper)
function populateStageSelects() {
  const stages = store.getPipelineStages();
  const dealStageSelect = document.getElementById("d-stage");
  if (dealStageSelect) {
    dealStageSelect.innerHTML = stages.length > 0
      ? stages.map(s => `<option value="${s.key}">${s.label}</option>`).join('')
      : '<option value="" disabled selected>No pipeline stages available</option>';
  }
}

// --- Drawer Slide Pane Closing Binds ---
function setupDrawerEvents() {
  btnCloseDrawer.addEventListener('click', () => {
    contactDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");
  });

  drawerOverlay.addEventListener('click', () => {
    contactDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");
  });

  // Drawer Sub-tabs toggle controls
  const tabTriggers = document.querySelectorAll(".drawer-tabs .drawer-tab");
  tabTriggers.forEach(tab => {
    tab.addEventListener('click', () => {
      tabTriggers.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetPane = tab.getAttribute("data-drawer-tab");
      document.querySelectorAll(".drawer-content .drawer-pane").forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(`pane-${targetPane}`).classList.add('active');
    });
  });
}

// --- Theme Management ---
function setupThemeManager() {
  // Apply stored theme on start
  const activeTheme = store.getTheme();
  document.documentElement.setAttribute("data-theme", activeTheme);
}

window.setCRMTheme = async (theme) => {
  await store.setTheme(theme);
  showToast("success", `Theme changed to ${theme} mode.`);
  window.dispatchEvent(new CustomEvent("crm-theme-changed", { detail: { theme } }));
};

let deferredInstallPrompt = null;
let desktopAppInstalled = false;

function isDesktopAppInstalled() {
  return desktopAppInstalled
    || window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function getPwaInstallState() {
  return {
    canInstall: Boolean(deferredInstallPrompt),
    isInstalled: isDesktopAppInstalled()
  };
}

async function installDesktopApp() {
  if (isDesktopAppInstalled()) {
    showToast("success", "Abilix CRM is already installed.");
    return { outcome: "installed" };
  }

  if (!deferredInstallPrompt) {
    showToast("warning", "Install prompt is not ready yet. Use Chrome or Edge on HTTPS or localhost.");
    return { outcome: "unavailable" };
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  window.dispatchEvent(new CustomEvent("crm-pwa-install-state-changed"));

  if (choice.outcome === "accepted") {
    showToast("success", "Desktop app installation started.");
  } else {
    showToast("warning", "Desktop app installation cancelled.");
  }

  return choice;
}

function setupPwaSupport() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("crm-pwa-install-state-changed"));
  });

  window.addEventListener("appinstalled", () => {
    desktopAppInstalled = true;
    deferredInstallPrompt = null;
    showToast("success", "Abilix CRM desktop app installed.");
    window.dispatchEvent(new CustomEvent("crm-pwa-install-state-changed"));
  });

  if ("serviceWorker" in navigator && ["http:", "https:"].includes(window.location.protocol)) {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("abilix-pwa: service worker registration failed", error);
    });
  }
}

window.crmGetInstallState = getPwaInstallState;
window.crmInstallDesktopApp = installDesktopApp;

// --- Pipeline Stages Customizer ---
function openPipelineCustomizer() {
  const modal = document.getElementById("pipeline-stages-modal");
  if (!modal) return;

  let tempStages = store.getPipelineStages().map(s => ({ ...s, color: normalizeStageColor(s.color) }));

  const listContainer = document.getElementById("stages-manager-list");
  const newLabelInput = document.getElementById("new-stage-label");
  const newColorSelect = document.getElementById("new-stage-color");
  const btnAddStage = document.getElementById("btn-add-stage-item");
  const btnSave = document.getElementById("btn-save-pipeline-stages");

  newColorSelect.innerHTML = renderStageColorOptions(newColorSelect.value || "#3b82f6");
  newColorSelect.closest(".stage-color-control")?.style.setProperty("--stage-color", normalizeStageColor(newColorSelect.value));
  newColorSelect.addEventListener("change", () => {
    newColorSelect.closest(".stage-color-control")?.style.setProperty("--stage-color", normalizeStageColor(newColorSelect.value));
  });

  function renderTempStages() {
    listContainer.innerHTML = tempStages.map((st, index) => {
      const color = normalizeStageColor(st.color);
      return `
        <div class="stage-manager-item" data-index="${index}" style="--stage-color:${color};display:flex;align-items:center;gap:10px;background:rgba(var(--bg-card-rgb), 0.4);border:1px solid color-mix(in srgb, var(--stage-color) 35%, var(--border-color));border-radius:var(--radius-sm);padding:8px 12px;transition:var(--transition-fast);width:100%;box-shadow:0 0 18px color-mix(in srgb, var(--stage-color) 18%, transparent);">
          <div style="flex:1;">
            <input type="text" class="form-control stage-label-input" value="${st.label}" data-index="${index}" style="margin-bottom:0;padding:6px 10px;font-size:13px;height:34px;background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary);border-radius:var(--radius-sm);width:100%;">
          </div>
          <div class="stage-color-control" style="width:140px;flex-shrink:0;position:relative;--stage-color:${color};">
            <span class="stage-color-dot" aria-hidden="true"></span>
            <select class="form-control stage-color-select" data-index="${index}" style="margin-bottom:0;padding:0 8px;font-size:13px;height:34px;background:var(--bg-input);border:1px solid var(--border-color);color:var(--text-primary);border-radius:var(--radius-sm);width:100%;">
              ${renderStageColorOptions(color)}
            </select>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button type="button" class="btn btn-outline btn-sm btn-stage-up" data-index="${index}" title="Move Up" style="padding:0 8px;height:34px;min-width:34px;" ${index === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}><i data-lucide="chevron-up" style="width:14px;height:14px;"></i></button>
            <button type="button" class="btn btn-outline btn-sm btn-stage-down" data-index="${index}" title="Move Down" style="padding:0 8px;height:34px;min-width:34px;" ${index === tempStages.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}><i data-lucide="chevron-down" style="width:14px;height:14px;"></i></button>
            <button type="button" class="btn btn-outline btn-sm btn-stage-delete" data-index="${index}" title="Delete Stage" style="padding:0 8px;height:34px;min-width:34px;color:var(--accent-crimson);border-color:rgba(239,68,68,0.2);" ${tempStages.length <= 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Bind input and select changes to sync with tempStages
    listContainer.querySelectorAll(".stage-label-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(input.getAttribute("data-index"));
        tempStages[idx].label = e.target.value;
      });
    });

    listContainer.querySelectorAll(".stage-color-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const idx = parseInt(select.getAttribute("data-index"));
        const color = normalizeStageColor(e.target.value);
        tempStages[idx].color = color;
        select.closest(".stage-color-control")?.style.setProperty("--stage-color", color);
        select.closest(".stage-manager-item")?.style.setProperty("--stage-color", color);
      });
    });

    // Bind up button
    listContainer.querySelectorAll(".btn-stage-up").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        if (idx > 0) {
          // Swap
          const temp = tempStages[idx];
          tempStages[idx] = tempStages[idx - 1];
          tempStages[idx - 1] = temp;
          renderTempStages();
        }
      });
    });

    // Bind down button
    listContainer.querySelectorAll(".btn-stage-down").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        if (idx < tempStages.length - 1) {
          // Swap
          const temp = tempStages[idx];
          tempStages[idx] = tempStages[idx + 1];
          tempStages[idx + 1] = temp;
          renderTempStages();
        }
      });
    });

    // Bind delete button
    listContainer.querySelectorAll(".btn-stage-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"));
        if (tempStages.length > 1) {
          const activeDeals = store.getDeals().filter(d => d.stage === tempStages[idx].key).length;
          let confirmMsg = `Are you sure you want to delete stage "${tempStages[idx].label || 'unnamed'}"?`;
          if (activeDeals > 0) {
            confirmMsg += `\n\nWARNING: There are ${activeDeals} active deal(s) in this stage! They will be migrated automatically to the first remaining stage ("${tempStages[idx === 0 ? 1 : 0].label}").`;
          }
          if (confirm(confirmMsg)) {
            tempStages.splice(idx, 1);
            renderTempStages();
          }
        }
      });
    });
  }

  // Bind add stage item
  const newBtnAddStage = btnAddStage.cloneNode(true);
  btnAddStage.parentNode.replaceChild(newBtnAddStage, btnAddStage);
  
  newBtnAddStage.addEventListener("click", () => {
    const labelVal = newLabelInput.value.trim();
    if (!labelVal) {
      showToast("warning", "Please enter a pipeline stage label first.");
      return;
    }

    // Generate unique key
    let keyVal = labelVal.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!keyVal) keyVal = "stage-" + Date.now();

    // Prevent duplicate keys
    if (tempStages.some(st => st.key === keyVal)) {
      keyVal += "-" + Date.now().toString().slice(-4);
    }

    const colorVal = normalizeStageColor(newColorSelect.value);
    tempStages.push({ key: keyVal, label: labelVal, color: colorVal });
    
    newLabelInput.value = "";
    renderTempStages();
  });

  // Bind save changes
  const newBtnSave = btnSave.cloneNode(true);
  btnSave.parentNode.replaceChild(newBtnSave, btnSave);

  newBtnSave.addEventListener("click", async () => {
    // Basic validations
    if (tempStages.length === 0) {
      showToast("warning", "You must have at least one stage in your pipeline.");
      return;
    }
    
    // Check if any stage has empty label
    for (let i = 0; i < tempStages.length; i++) {
      if (!tempStages[i].label.trim()) {
        showToast("warning", "Stage labels cannot be empty.");
        return;
      }
    }

    const stagesToSave = tempStages.map((stage, index) => ({
      ...stage,
      label: stage.label.trim(),
      color: normalizeStageColor(stage.color),
      position: index
    }));

    await store.savePipelineStages(stagesToSave);
    modal.classList.remove("active");
    navigateToView(currentView); // Refresh current pipeline page
    showToast("success", "Pipeline stages customized successfully.");
  });

  renderTempStages();
  modal.classList.add("active");
}

// --- Toast Alerts Engine ---
function showToast(type, message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconName = "check-circle";
  if (type === "warning") iconName = "alert-triangle";
  if (type === "danger") iconName = "x-circle";

  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-message">${message}</div>
    <button class="toast-close"><i data-lucide="x"></i></button>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Bind individual close button click
  toast.querySelector(".toast-close").addEventListener('click', () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px) scale(0.9)";
    setTimeout(() => toast.remove(), 300);
  });

  // Auto remove in 3.5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px) scale(0.9)";
      setTimeout(() => toast.remove(), 300);
    }
  }, 3500);
}

// --- Global Event Dispatch Handlers ---
function setupGlobalEvents() {
  // Listen for component toast requests
  window.addEventListener('crm-alert', (e) => {
    const { type, message } = e.detail;
    showToast(type, message);
  });

  // Listen for request to open Pipeline Customizer modal
  window.addEventListener('crm-open-pipeline-customizer', () => {
    openPipelineCustomizer();
  });

  window.addEventListener('crm-open-deal-modal', (e) => {
    window.openDealFormModal?.(e.detail?.contactId || "");
  });

  window.addEventListener('crm-open-task-modal', (e) => {
    window.openTaskFormModal?.(e.detail?.contactId || "");
  });

  window.addEventListener('crm-open-contact-modal', () => {
    window.openContactFormModal?.();
  });

  // Listen for request to open Contact slide drawer from anywhere
  window.addEventListener('crm-open-contact-drawer', (e) => {
    const { contactId } = e.detail;
    openContactDrawer(contactId, store, () => {
      // Re-trigger render on whatever current view we are in to sync changes
      navigateToView(currentView);
    });
  });

  // Sidebar navigation click triggers
  sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute("data-view");
      if (viewId) navigateToView(viewId);
    });
  });

  // Sidebar Mobile Toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle("active");
  });

  // Global search handler (searches across Contacts table)
  const globalSearchInput = document.getElementById("global-search");
  globalSearchInput.addEventListener('input', () => {
    const query = globalSearchInput.value.trim().toLowerCase();
    if (!query) return;

    // Auto navigate to contacts view if not already there, and filter
    if (currentView !== "contacts") {
      navigateToView("contacts");
      setTimeout(() => {
        const contactSearch = document.getElementById("contact-search");
        if (contactSearch) {
          contactSearch.value = query;
          contactSearch.dispatchEvent(new Event('input'));
        }
      }, 100);
    } else {
      const contactSearch = document.getElementById("contact-search");
      if (contactSearch) {
        contactSearch.value = query;
        contactSearch.dispatchEvent(new Event('input'));
      }
    }
  });
}

// --- Setup Authentication Event Listeners ---
function setupAuthEvents() {
  // Login Form submission with CAPTCHA secure check
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 1. CAPTCHA verification check (Faisal request)
    const inputCaptcha = document.getElementById("login-captcha").value.trim().toUpperCase();
    if (inputCaptcha !== currentCaptchaCode) {
      showToast("danger", "Security Verification Failed. Please solve the CAPTCHA correctly.");
      generateCaptcha(); // Refresh CAPTCHA distorter on failure
      document.getElementById("login-captcha").value = "";
      return;
    }

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    const success = await store.login(username, password);
    if (success) {
      const user = store.getCurrentUser();
      showToast("success", `Welcome back to Abilix CRM, ${user.name}!`);
      
      // Bootstrap the newly logged in session
      checkAuthentication();
      navigateToView("dashboard");
    } else {
      showToast("danger", "Access Denied. Invalid username or password.");
      generateCaptcha(); // Refresh CAPTCHA
      document.getElementById("login-captcha").value = "";
    }
  });

  // Logout button trigger
  btnLogout.addEventListener("click", () => {
    const user = store.getCurrentUser();
    const name = user ? user.name : "User";
    
    store.logout();
    showToast("warning", `Logged out from Abilix CRM. Goodbye ${name}!`);
    
    checkAuthentication();
  });

  // CAPTCHA Refresh elements binds
  const btnRefresh = document.getElementById("btn-refresh-captcha");
  const canvasCaptcha = document.getElementById("captcha-canvas");
  if (btnRefresh) btnRefresh.addEventListener("click", () => { generateCaptcha(); document.getElementById("login-captcha").value = ""; });
  if (canvasCaptcha) canvasCaptcha.addEventListener("click", () => { generateCaptcha(); document.getElementById("login-captcha").value = ""; });
}

// --- App Bootstrap ---
document.addEventListener("DOMContentLoaded", async () => {
  setupPwaSupport();
  setupModalEvents();
  setupDrawerEvents();
  setupGlobalEvents();
  setupAuthEvents();

  // Load auth gate on start
  if (store.getSessionToken()) {
    containerLoadingState();
    await store.loadSession(); // preload cache before routing
  }
  
  checkAuthentication();

  // If authenticated, navigate to dashboard view
  if (store.getCurrentUser()) {
    navigateToView("dashboard");
  }
});
