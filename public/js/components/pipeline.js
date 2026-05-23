// pipeline.js - HTML5 Drag & Drop Deal Kanban Pipeline Board

window.renderPipeline = function(container, store) {
  if (!container) return;

  const STAGES = store.getPipelineStages();

  // Render core Kanban columns framework
  container.innerHTML = `
    <div class="toolbar-actions">
      <div class="toolbar-filters">
        <h2 style="font-family:var(--font-title);font-size:18px;font-weight:600;">Sales Pipeline</h2>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline" id="btn-customize-pipeline">
          <i data-lucide="settings"></i> Customize Pipeline
        </button>
        <button class="btn btn-primary" id="btn-add-deal">
          <i data-lucide="plus"></i> Add New Deal
        </button>
      </div>
    </div>

    <!-- Scrollable Columns Grid -->
    <div class="pipeline-container" id="pipeline-scroll-container">
      ${STAGES.map(st => {
        return `
          <div class="pipeline-column" data-stage="${st.key}">
            <div class="column-header">
              <div class="column-title">
                <h4>${st.label}</h4>
                <span class="column-count" id="count-${st.key}">0</span>
              </div>
              <div class="column-value" id="val-${st.key}">${window.CURRENCY_SYMBOL || '₹'}0</div>
            </div>
            <div class="column-cards-list" id="list-${st.key}">
              <!-- Render cards dynamically -->
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  lucide.createIcons();

  // Populate Columns and Bind Drag & Drop Events
  const contacts = store.getContacts();

  function loadDeals() {
    const deals = store.getDeals();

    STAGES.forEach(st => {
      const columnDeals = deals.filter(d => d.stage === st.key);
      const listContainer = document.getElementById(`list-${st.key}`);
      const countBadge = document.getElementById(`count-${st.key}`);
      const totalValLabel = document.getElementById(`val-${st.key}`);

      // Calculations
      const columnTotal = columnDeals.reduce((sum, d) => sum + d.value, 0);
      countBadge.textContent = columnDeals.length;
      totalValLabel.textContent = `${window.CURRENCY_SYMBOL || '₹'}${columnTotal.toLocaleString()}`;

      if (columnDeals.length === 0) {
        listContainer.innerHTML = `
          <div class="column-empty-state" style="text-align:center;font-size:11px;color:var(--text-tertiary);padding:30px 10px;border:1px dashed var(--border-color);border-radius:var(--radius-sm);">
            No deals
          </div>
        `;
        return;
      }

      listContainer.innerHTML = columnDeals.map(d => {
        const contact = contacts.find(c => c.id === d.contactId);
        const formattedDate = d.closeDate ? new Date(d.closeDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '—';
        return `
          <div class="deal-card" draggable="true" data-id="${d.id}">
            <div class="deal-card-title">${d.name}</div>
            <div class="deal-card-company">${contact ? `${contact.name} (${contact.company})` : 'Unassigned Contact'}</div>
            
            <div class="deal-card-footer">
              <div class="deal-card-value">${window.CURRENCY_SYMBOL || '₹'}${d.value.toLocaleString()}</div>
              <div class="deal-card-date" title="Expected Close Date">
                <i data-lucide="calendar" style="width:10px;height:10px;vertical-align:middle;margin-right:2px;"></i>
                ${formattedDate}
              </div>
            </div>
          </div>
        `;
      }).join('');
    });

    // --- Re-bind Interactive Events ---
    bindDragEvents();
    bindCardClicks();
    lucide.createIcons();
  }

  // Bind native drag-drop interactions
  function bindDragEvents() {
    const cards = container.querySelectorAll(".deal-card");
    const columns = container.querySelectorAll(".pipeline-column");

    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.getAttribute("data-id"));
        e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });
    });

    columns.forEach(col => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drag-over");
      });

      col.addEventListener("dragleave", () => {
        col.classList.remove("drag-over");
      });

      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        
        const dealId = e.dataTransfer.getData("text/plain");
        const newStage = col.getAttribute("data-stage");
        const deal = store.getDeal(dealId);

        if (deal && deal.stage !== newStage) {
          store.updateDealStage(dealId, newStage);
          
          // Reload
          loadDeals();

          // Dispatch visual notification alert
          window.dispatchEvent(new CustomEvent('crm-alert', {
            detail: { 
              type: newStage === 'closed-won' ? 'success' : newStage === 'closed-lost' ? 'danger' : 'success', 
              message: `Deal "${deal.name}" moved to ${col.querySelector('h4').textContent}` 
            }
          }));
        }
      });
    });
  }

  // Deal card details click/modifying/deletion
  function bindCardClicks() {
    const cards = container.querySelectorAll(".deal-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const deal = store.getDeal(id);
        if (!deal) return;

        // Visual alert for deleting or details editing
        if (confirm(`Deal: ${deal.name}\nValue: ${window.CURRENCY_SYMBOL || '₹'}${deal.value.toLocaleString()}\nStage: ${deal.stage.replace(/-/g, ' ')}\n\nDo you want to delete this deal permanently?`)) {
          store.deleteDeal(id);
          loadDeals();
          
          window.dispatchEvent(new CustomEvent('crm-alert', {
            detail: { type: 'danger', message: `Deal deleted successfully` }
          }));
        }
      });
    });
  }

  // Load items
  loadDeals();

  // Create Deal action opens deal form modal
  document.getElementById("btn-add-deal").addEventListener('click', () => {
    document.getElementById("deal-modal").classList.add("active");
  });

  document.getElementById("btn-customize-pipeline").addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('crm-open-pipeline-customizer'));
  });
}
