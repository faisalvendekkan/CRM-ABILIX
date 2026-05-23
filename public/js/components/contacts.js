// contacts.js - Advanced Contact Management Panel & Detail Slideout Drawer

window.renderContacts = function(container, store) {
  if (!container) return;

  // Render main contacts toolbar and table layout skeleton
  container.innerHTML = `
    <div class="toolbar-actions">
      <div class="toolbar-filters">
        <!-- Search -->
        <div class="search-bar" style="width: 240px;">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="contact-search" placeholder="Search contacts...">
        </div>
        
        <!-- Filter Stage -->
        <select class="select-filter" id="filter-stage">
          <option value="ALL">All Lifecycle Stages</option>
          <option value="Lead">Lead</option>
          <option value="Marketing Qualified">MQL</option>
          <option value="Sales Qualified">SQL</option>
          <option value="Customer">Customer</option>
          <option value="Evangelist">Evangelist</option>
        </select>

        <!-- Filter Status -->
        <select class="select-filter" id="filter-status">
          <option value="ALL">All Lead Statuses</option>
          <option value="Active">Active</option>
          <option value="Nurturing">Nurturing</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <button class="btn btn-primary" id="btn-add-contact">
        <i data-lucide="plus"></i> Add Contact
      </button>
    </div>

    <!-- Table Content wrapper -->
    <div class="table-wrapper">
      <table class="contacts-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Lifecycle Stage</th>
            <th>Status</th>
            <th>Value</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody id="contacts-table-body">
          <!-- Rendered dynamically -->
        </tbody>
      </table>
    </div>
  `;

  // Draw Lucide icons
  lucide.createIcons();

  // Load and apply filters
  const tableBody = document.getElementById("contacts-table-body");
  const searchInput = document.getElementById("contact-search");
  const stageSelect = document.getElementById("filter-stage");
  const statusSelect = document.getElementById("filter-status");

  function updateTable() {
    const query = searchInput.value.toLowerCase();
    const stageVal = stageSelect.value;
    const statusVal = statusSelect.value;

    const contacts = store.getContacts().filter(c => {
      const matchQuery = c.name.toLowerCase().includes(query) || c.company.toLowerCase().includes(query) || c.email.toLowerCase().includes(query);
      const matchStage = stageVal === "ALL" || c.stage === stageVal;
      const matchStatus = statusVal === "ALL" || c.status === statusVal;
      return matchQuery && matchStage && matchStatus;
    });

    if (contacts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-tertiary);padding:40px;">
            <i data-lucide="info" style="width:32px;height:32px;margin-bottom:8px;opacity:0.5;"></i>
            <p>No contacts found matching the filters.</p>
          </td>
        </tr>
      `;
      lucide.createIcons();
      return;
    }

    tableBody.innerHTML = contacts.map(c => {
      const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const stageClass = c.stage.toLowerCase() === 'lead' ? 'lead' 
                       : c.stage.toLowerCase().includes('marketing') ? 'mql' 
                       : c.stage.toLowerCase().includes('sales') ? 'sql' 
                       : c.stage.toLowerCase() === 'customer' ? 'customer' : 'evangelist';
      
      const statusClass = c.status.toLowerCase();
      const createdDate = new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

      return `
        <tr data-id="${c.id}">
          <td>
            <div class="contact-name-cell">
              <div class="contact-avatar-circle">${initials}</div>
              <div style="display:flex; flex-direction:column;">
                <span class="name">${c.name}</span>
                <span style="font-size:11px;color:var(--text-tertiary);font-weight:400;">${c.email}</span>
              </div>
            </div>
          </td>
          <td><span class="company">${c.company || '—'}</span></td>
          <td><span class="badge badge-${stageClass}">${c.stage}</span></td>
          <td><span class="badge badge-${statusClass}">${c.status}</span></td>
          <td><span class="text-accent">${window.CURRENCY_SYMBOL || '₹'}${c.value.toLocaleString()}</span></td>
          <td style="color:var(--text-secondary);">${createdDate}</td>
        </tr>
      `;
    }).join('');

    // Re-bind row click listener to open the slide drawer
    tableBody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const contactId = row.getAttribute('data-id');
        if (contactId) {
          openContactDrawer(contactId, store, () => {
            // Callback to refresh table on updates
            updateTable();
          });
        }
      });
    });

    lucide.createIcons();
  }

  // Bind Event Listeners
  searchInput.addEventListener('input', updateTable);
  stageSelect.addEventListener('change', updateTable);
  statusSelect.addEventListener('change', updateTable);

  // Trigger initial draw
  updateTable();

  // Add Contact modal open
  document.getElementById("btn-add-contact").addEventListener('click', () => {
    document.getElementById("contact-modal").classList.add("active");
  });
}

/**
 * Slide open contact drawer panel details and timeline logs
 * @param {string} contactId 
 * @param {CRMStore} store 
 * @param {Function} refreshCallback - Refreshes the back table
 */
window.openContactDrawer = function(contactId, store, refreshCallback) {
  const drawer = document.getElementById("contact-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (!drawer || !overlay) return;

  const contact = store.getContact(contactId);
  if (!contact) return;

  // Active composer state holder
  let selectedComposerType = "Note";

  // --- Populate Overview Pane Info ---
  document.getElementById("drawer-badge").className = `badge badge-${
    contact.stage.toLowerCase() === 'lead' ? 'lead' 
    : contact.stage.toLowerCase().includes('marketing') ? 'mql' 
    : contact.stage.toLowerCase().includes('sales') ? 'sql' 
    : contact.stage.toLowerCase() === 'customer' ? 'customer' : 'evangelist'
  }`;
  document.getElementById("drawer-badge").textContent = contact.stage;
  document.getElementById("drawer-contact-name").textContent = contact.name;
  document.getElementById("drawer-contact-company").textContent = contact.company || '—';
  
  document.getElementById("drawer-email").textContent = contact.email;
  document.getElementById("drawer-phone").textContent = contact.phone || '—';
  document.getElementById("drawer-value").textContent = `${window.CURRENCY_SYMBOL || '₹'}${contact.value.toLocaleString()}`;
  document.getElementById("drawer-created").textContent = new Date(contact.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Set selects values
  document.getElementById("drawer-stage-select").value = contact.stage;
  document.getElementById("drawer-status-select").value = contact.status;

  // --- Load Associated Deals List ---
  const dealContainer = document.getElementById("drawer-associated-deals");
  const associatedDeals = store.getDeals().filter(d => d.contactId === contactId);
  if (associatedDeals.length === 0) {
    dealContainer.innerHTML = `<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:10px 0;">No active deals linked.</div>`;
  } else {
    dealContainer.innerHTML = associatedDeals.map(deal => {
      return `
        <div class="associated-item">
          <div>
            <div class="associated-item-title">${deal.name}</div>
            <div class="associated-item-subtitle">${window.CURRENCY_SYMBOL || '₹'}${deal.value.toLocaleString()} • target: ${deal.closeDate}</div>
          </div>
          <span class="badge" style="font-size:10px;padding:2px 8px;background:var(--border-color);">${deal.stage.replace(/-/g, ' ')}</span>
        </div>
      `;
    }).join('');
  }

  // --- Load Associated Tasks List ---
  const taskContainer = document.getElementById("drawer-associated-tasks");
  const associatedTasks = store.getTasks().filter(t => t.contactId === contactId && !t.completed);
  if (associatedTasks.length === 0) {
    taskContainer.innerHTML = `<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:10px 0;">No pending tasks scheduled.</div>`;
  } else {
    taskContainer.innerHTML = associatedTasks.map(task => {
      return `
        <div class="associated-item">
          <div>
            <div class="associated-item-title" style="font-weight:500;">${task.title}</div>
            <div class="associated-item-subtitle">Due: ${task.dueDate}</div>
          </div>
          <span class="priority-ring priority-${task.priority.toLowerCase()}">${task.priority}</span>
        </div>
      `;
    }).join('');
  }

  // --- Populate Timeline Feed ---
  const timelineFeed = document.getElementById("contact-timeline-feed");
  function renderTimelineFeed() {
    const list = store.getActivitiesForContact(contactId);
    if (list.length === 0) {
      timelineFeed.innerHTML = `<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:30px 0;">No activities logged yet. Log a call or note above!</div>`;
      return;
    }
    timelineFeed.innerHTML = list.map(act => {
      const formattedDate = new Date(act.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="timeline-item ${act.type.replace(/\s+/g, '')}">
          <div class="timeline-dot"></div>
          <div class="timeline-header">
            <span class="timeline-type">${act.type}</span>
            <span class="timeline-date">${formattedDate}</span>
          </div>
          <div class="timeline-body">${act.content}</div>
        </div>
      `;
    }).join('');
  }
  
  // Render timeline feed
  renderTimelineFeed();

  // Open Drawer slide-in
  drawer.classList.add("active");
  overlay.classList.add("active");
  lucide.createIcons();

  // --- Active Select Modifiers ---
  const stageSelect = document.getElementById("drawer-stage-select");
  const statusSelect = document.getElementById("drawer-status-select");

  // Unbind older event listeners
  const newStageSelect = stageSelect.cloneNode(true);
  stageSelect.parentNode.replaceChild(newStageSelect, stageSelect);
  const newStatusSelect = statusSelect.cloneNode(true);
  statusSelect.parentNode.replaceChild(newStatusSelect, statusSelect);

  newStageSelect.addEventListener('change', () => {
    store.updateContact(contactId, { stage: newStageSelect.value });
    document.getElementById("drawer-badge").className = `badge badge-${
      newStageSelect.value.toLowerCase() === 'lead' ? 'lead' 
      : newStageSelect.value.toLowerCase().includes('marketing') ? 'mql' 
      : newStageSelect.value.toLowerCase().includes('sales') ? 'sql' 
      : newStageSelect.value.toLowerCase() === 'customer' ? 'customer' : 'evangelist'
    }`;
    document.getElementById("drawer-badge").textContent = newStageSelect.value;
    
    refreshCallback();
    
    window.dispatchEvent(new CustomEvent('crm-alert', {
      detail: { type: 'success', message: `Lifecycle stage updated to ${newStageSelect.value}` }
    }));
  });

  newStatusSelect.addEventListener('change', () => {
    store.updateContact(contactId, { status: newStatusSelect.value });
    refreshCallback();

    window.dispatchEvent(new CustomEvent('crm-alert', {
      detail: { type: 'success', message: `Lead status updated to ${newStatusSelect.value}` }
    }));
  });

  // --- Timeline composer tabs ---
  const composerTabs = drawer.querySelectorAll(".composer-tab");
  composerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      composerTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedComposerType = tab.getAttribute('data-type') || "Note";
    });
  });

  // Log activity action
  const saveActivityBtn = document.getElementById("btn-save-activity");
  const textarea = document.getElementById("composer-textarea");

  // Clone to avoid multiple events stacking
  const newSaveBtn = saveActivityBtn.cloneNode(true);
  saveActivityBtn.parentNode.replaceChild(newSaveBtn, saveActivityBtn);

  newSaveBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) {
      window.dispatchEvent(new CustomEvent('crm-alert', {
        detail: { type: 'danger', message: `Activity content cannot be empty.` }
      }));
      return;
    }

    store.addActivity({
      type: selectedComposerType,
      content: text,
      contactId: contactId
    });

    // Clear and reload
    textarea.value = "";
    renderTimelineFeed();

    window.dispatchEvent(new CustomEvent('crm-alert', {
      detail: { type: 'success', message: `${selectedComposerType} activity logged successfully!` }
    }));
  });

  // Drawer associated clicks triggers
  const addDealBtn = document.getElementById("btn-add-associated-deal");
  const addDealBtnClone = addDealBtn.cloneNode(true);
  addDealBtn.parentNode.replaceChild(addDealBtnClone, addDealBtn);
  addDealBtnClone.addEventListener('click', () => {
    // Fill contact value automatically on deal modal and show
    const dealModal = document.getElementById("deal-modal");
    const contactSelect = document.getElementById("d-contact");
    contactSelect.value = contactId;
    dealModal.classList.add("active");
    
    // Close Drawer first
    drawer.classList.remove("active");
    overlay.classList.remove("active");
  });

  const addTaskBtn = document.getElementById("btn-add-associated-task");
  const addTaskBtnClone = addTaskBtn.cloneNode(true);
  addTaskBtn.parentNode.replaceChild(addTaskBtnClone, addTaskBtn);
  addTaskBtnClone.addEventListener('click', () => {
    const taskModal = document.getElementById("task-modal");
    const contactSelect = document.getElementById("t-contact");
    contactSelect.value = contactId;
    taskModal.classList.add("active");
    
    // Close Drawer first
    drawer.classList.remove("active");
    overlay.classList.remove("active");
  });

  // Delete Contact trigger
  const deleteBtn = document.getElementById("btn-delete-contact");
  const deleteBtnClone = deleteBtn.cloneNode(true);
  deleteBtn.parentNode.replaceChild(deleteBtnClone, deleteBtn);
  deleteBtnClone.addEventListener('click', () => {
    if (confirm(`Are you absolutely sure you want to delete ${contact.name}? All associated deals and tasks will be removed permanently.`)) {
      store.deleteContact(contactId);
      
      // Close drawer
      drawer.classList.remove("active");
      overlay.classList.remove("active");
      
      // Refresh
      refreshCallback();
      
      window.dispatchEvent(new CustomEvent('crm-alert', {
        detail: { type: 'danger', message: `Contact record deleted successfully.` }
      }));
    }
  });
}
