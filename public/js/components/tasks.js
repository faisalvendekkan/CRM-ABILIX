// tasks.js - Task Agenda and Due Reminders Board View

window.renderTasks = function(container, store) {
  if (!container) return;

  // Render core tasks structure
  container.innerHTML = `
    <div class="tasks-container">
      <div class="toolbar-actions">
        <div class="toolbar-filters">
          <!-- Filter Completion -->
          <select class="select-filter" id="filter-task-status">
            <option value="ALL" selected>All Tasks Status</option>
            <option value="active">Active Agenda</option>
            <option value="completed">Completed Tasks</option>
          </select>

          <!-- Filter Priority -->
          <select class="select-filter" id="filter-task-priority">
            <option value="ALL">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        <button class="btn btn-primary" id="btn-add-task">
          <i data-lucide="plus"></i> Schedule Task
        </button>
      </div>

      <!-- Scrollable Task List -->
      <div class="tasks-card-list" id="tasks-list-container">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  lucide.createIcons();

  const listContainer = document.getElementById("tasks-list-container");
  const filterStatusSelect = document.getElementById("filter-task-status");
  const filterPrioritySelect = document.getElementById("filter-task-priority");

  function loadTasksList() {
    const contacts = store.getContacts();
    const tasks = store.getTasks();

    const statusVal = filterStatusSelect.value;
    const priorityVal = filterPrioritySelect.value;

    const filtered = tasks.filter(t => {
      const matchStatus = statusVal === "ALL" 
                        || (statusVal === "active" && !t.completed) 
                        || (statusVal === "completed" && t.completed);
      
      const matchPriority = priorityVal === "ALL" || t.priority === priorityVal;
      return matchStatus && matchPriority;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); // Sort by closest deadline

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-panel" style="text-align:center;color:var(--text-tertiary);padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <i data-lucide="clipboard-list" style="width:40px;height:40px;margin-bottom:12px;opacity:0.5;color:var(--accent-indigo);"></i>
          <h3>No tasks scheduled</h3>
          <p style="font-size:13px;margin-top:6px;max-width:300px;">Create a new task to follow up on contacts or deals in the pipeline.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const contact = contacts.find(c => c.id === t.contactId);
      const isCompleted = t.completed ? 'completed' : '';
      const priorityClass = t.priority.toLowerCase();

      return `
        <div class="task-item ${isCompleted}" data-id="${t.id}">
          <div class="task-item-left">
            <div class="task-checkbox btn-toggle-task" data-id="${t.id}" title="Toggle Complete">
              <i data-lucide="check" style="width:14px;height:14px;"></i>
            </div>
            
            <div class="task-item-content">
              <span class="task-title">${t.title}</span>
              <div class="task-meta">
                <span>Due Date: ${t.dueDate}</span>
                ${contact ? `
                  <span class="task-meta-dot"></span>
                  <span class="open-contact-link text-accent" style="cursor:pointer;font-weight:600;" data-id="${contact.id}">
                    <i data-lucide="user" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:2px;"></i>${contact.name}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="task-item-right">
            <span class="priority-ring priority-${priorityClass}">${t.priority}</span>
            <button class="btn-icon btn-delete-task" data-id="${t.id}" title="Delete Task">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // --- Bind Interactivity Actions ---
    
    // Toggle Status Checkboxes
    listContainer.querySelectorAll(".btn-toggle-task").forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute("data-id");
        if (taskId) {
          store.toggleTaskCompleted(taskId);
          
          // Toast Alert
          const updated = store.getTasks().find(t => t.id === taskId);
          window.dispatchEvent(new CustomEvent('crm-alert', {
            detail: {
              type: updated.completed ? 'success' : 'warning',
              message: updated.completed ? 'Agenda Task Completed!' : 'Task re-opened.'
            }
          }));

          // Reload Tasks
          loadTasksList();
        }
      });
    });

    // Delete Tasks
    listContainer.querySelectorAll(".btn-delete-task").forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.getAttribute("data-id");
        if (taskId && confirm("Are you sure you want to delete this task?")) {
          store.deleteTask(taskId);
          
          window.dispatchEvent(new CustomEvent('crm-alert', {
            detail: { type: 'danger', message: 'Task deleted successfully.' }
          }));

          loadTasksList();
        }
      });
    });

    // Contact Slider drawer trigger click
    listContainer.querySelectorAll(".open-contact-link").forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = link.getAttribute("data-id");
        window.dispatchEvent(new CustomEvent('crm-open-contact-drawer', {
          detail: { contactId }
        }));
      });
    });

    lucide.createIcons();
  }

  // Bind dropdown filters
  filterStatusSelect.addEventListener('change', loadTasksList);
  filterPrioritySelect.addEventListener('change', loadTasksList);

  // Load items
  loadTasksList();

  // Create Task button triggers modal
  document.getElementById("btn-add-task").addEventListener('click', () => {
    if (window.openTaskFormModal) {
      window.openTaskFormModal();
      return;
    }
    window.dispatchEvent(new CustomEvent('crm-open-task-modal'));
  });
}
