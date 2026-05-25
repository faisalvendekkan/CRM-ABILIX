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

      <div class="toolbar-button-group">
        <button class="btn btn-outline" id="btn-export-contacts-excel">
          <i data-lucide="file-spreadsheet"></i> Export Excel
        </button>
        <button class="btn btn-outline" id="btn-download-contacts-pdf">
          <i data-lucide="file-down"></i> Download PDF
        </button>
        <button class="btn btn-primary" id="btn-add-contact">
          <i data-lucide="plus"></i> Add Contact
        </button>
      </div>
    </div>

    <!-- Table Content wrapper -->
    <div class="table-wrapper">
      <table class="contacts-table contacts-list-table">
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

  function getFilteredContacts() {
    const query = searchInput.value.toLowerCase();
    const stageVal = stageSelect.value;
    const statusVal = statusSelect.value;

    return store.getContacts().filter(c => {
      const searchable = [c.name, c.company, c.email].map(value => String(value || "").toLowerCase()).join(" ");
      const matchQuery = searchable.includes(query);
      const matchStage = stageVal === "ALL" || c.stage === stageVal;
      const matchStatus = statusVal === "ALL" || c.status === statusVal;
      return matchQuery && matchStage && matchStatus;
    });
  }

  function getExportRows() {
    return getFilteredContacts().map(c => ({
      name: c.name || "",
      company: c.company || "",
      email: c.email || "",
      phone: c.phone || "",
      stage: c.stage || "Lead",
      status: c.status || "",
      value: Number(c.value || 0),
      created: c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ""
    }));
  }

  function escapeCell(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function downloadBlob(filename, mimeType, content) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportContactsExcel() {
    const rows = getExportRows();
    if (rows.length === 0) {
      window.dispatchEvent(new CustomEvent('crm-alert', {
        detail: { type: 'warning', message: 'No contacts available to export.' }
      }));
      return;
    }

    const filename = `abilix-leads-contacts-${new Date().toISOString().slice(0, 10)}.xls`;
    const headers = ["Name", "Company", "Email", "Phone", "Lifecycle Stage", "Status", "Estimated Value", "Created"];
    const bodyRows = rows.map(row => [
      row.name,
      row.company,
      row.email,
      row.phone,
      row.stage,
      row.status,
      row.value,
      row.created
    ]);

    const htmlTable = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <table>
            <thead><tr>${headers.map(header => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${bodyRows.map(row => `<tr>${row.map(cell => `<td style="mso-number-format:'\\@';">${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    downloadBlob(filename, "application/vnd.ms-excel;charset=utf-8", htmlTable);
    window.dispatchEvent(new CustomEvent('crm-alert', {
      detail: { type: 'success', message: `Exported ${rows.length} leads and contacts to Excel.` }
    }));
  }

  function downloadContactsPdf() {
    const rows = getExportRows();
    if (rows.length === 0) {
      window.dispatchEvent(new CustomEvent('crm-alert', {
        detail: { type: 'warning', message: 'No contacts available for PDF download.' }
      }));
      return;
    }

    const pdfApi = window.jspdf && window.jspdf.jsPDF;
    if (!pdfApi) {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>Abilix Leads & Contacts</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h2>Abilix Leads & Contacts</h2>
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Stage</th><th>Status</th><th>Value</th><th>Created</th></tr></thead>
              <tbody>${rows.map(row => `<tr><td>${escapeCell(row.name)}</td><td>${escapeCell(row.company)}</td><td>${escapeCell(row.email)}</td><td>${escapeCell(row.phone)}</td><td>${escapeCell(row.stage)}</td><td>${escapeCell(row.status)}</td><td>${escapeCell(window.CURRENCY_SYMBOL || "\u20b9")}${row.value.toLocaleString()}</td><td>${escapeCell(row.created)}</td></tr>`).join("")}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    const doc = new pdfApi({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 32;
    const columns = [
      { label: "Name", width: 90 },
      { label: "Company", width: 90 },
      { label: "Email", width: 130 },
      { label: "Phone", width: 90 },
      { label: "Stage", width: 100 },
      { label: "Status", width: 70 },
      { label: "Value", width: 75 },
      { label: "Created", width: 85 }
    ];
    const rowHeight = 22;
    let y = 74;

    function drawTitle() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Abilix Leads & Contacts", margin, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated ${new Date().toLocaleDateString()} - ${rows.length} records`, margin, 54);
    }

    function drawHeader() {
      let x = margin;
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      columns.forEach(col => {
        doc.text(col.label, x + 4, y + 14, { maxWidth: col.width - 8 });
        x += col.width;
      });
      y += rowHeight;
    }

    function drawCellText(text, x, yPosition, width) {
      const value = String(text ?? "");
      doc.text(value.length > 38 ? `${value.slice(0, 35)}...` : value, x + 4, yPosition + 14, { maxWidth: width - 8 });
    }

    drawTitle();
    drawHeader();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    rows.forEach(row => {
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = 42;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      let x = margin;
      const values = [
        row.name,
        row.company,
        row.email,
        row.phone,
        row.stage,
        row.status,
        `${window.CURRENCY_SYMBOL || "\u20b9"}${row.value.toLocaleString()}`,
        row.created
      ];

      doc.setDrawColor(229, 231, 235);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight);
      values.forEach((value, index) => {
        drawCellText(value, x, y, columns[index].width);
        x += columns[index].width;
      });
      y += rowHeight;
    });

    doc.save(`abilix-leads-contacts-${new Date().toISOString().slice(0, 10)}.pdf`);
    window.dispatchEvent(new CustomEvent('crm-alert', {
      detail: { type: 'success', message: `Downloaded PDF for ${rows.length} leads and contacts.` }
    }));
  }

  function updateTable() {
    const contacts = getFilteredContacts();

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
  document.getElementById("btn-export-contacts-excel").addEventListener('click', exportContactsExcel);
  document.getElementById("btn-download-contacts-pdf").addEventListener('click', downloadContactsPdf);

  // Trigger initial draw
  updateTable();

  // Add Contact modal open
  document.getElementById("btn-add-contact").addEventListener('click', () => {
    if (window.openContactFormModal) {
      window.openContactFormModal();
      return;
    }
    window.dispatchEvent(new CustomEvent('crm-open-contact-modal'));
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
    if (window.openDealFormModal) {
      window.openDealFormModal(contactId);
    } else {
      window.dispatchEvent(new CustomEvent('crm-open-deal-modal', { detail: { contactId } }));
    }
    
    // Close Drawer first
    drawer.classList.remove("active");
    overlay.classList.remove("active");
  });

  const addTaskBtn = document.getElementById("btn-add-associated-task");
  const addTaskBtnClone = addTaskBtn.cloneNode(true);
  addTaskBtn.parentNode.replaceChild(addTaskBtnClone, addTaskBtn);
  addTaskBtnClone.addEventListener('click', () => {
    if (window.openTaskFormModal) {
      window.openTaskFormModal(contactId);
    } else {
      window.dispatchEvent(new CustomEvent('crm-open-task-modal', { detail: { contactId } }));
    }
    
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
