// dashboard.js - Renders Executive Overview & Dynamic Analytics Widgets

window.renderDashboard = function(container, store, navigateToView) {
  if (!container) return;

  const contacts = store.getContacts();
  const deals = store.getDeals();
  const tasks = store.getTasks();
  const activities = store.getActivities().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // --- Calculations ---
  const isWonStage = (stageKey) => {
    return stageKey === 'closed-won' || stageKey.toLowerCase().includes('won');
  };
  const isLostStage = (stageKey) => {
    return stageKey === 'closed-lost' || stageKey.toLowerCase().includes('lost');
  };

  // Total Revenue: Sum of Closed Won deals
  const totalRevenue = deals
    .filter(d => isWonStage(d.stage))
    .reduce((sum, d) => sum + d.value, 0);

  // Active Deals: Count of deals not in closed-won or closed-lost
  const activeDeals = deals.filter(d => !isWonStage(d.stage) && !isLostStage(d.stage));
  const activeDealsVal = activeDeals.reduce((sum, d) => sum + d.value, 0);

  // Tasks completed percentage
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Recent timeline activities (limit to 5)
  const recentActivities = activities.slice(0, 5);

  // Quick incomplete tasks (limit to 3)
  const quickTasks = tasks.filter(t => !t.completed).slice(0, 3);

  // Build HTML structural frame
  container.innerHTML = `
    <!-- Executive Statistics Grid -->
    <div class="stats-grid">
      
      <div class="glass-panel stats-card">
        <div class="stats-icon-wrapper icon-green">
          <i data-lucide="dollar-sign"></i>
        </div>
        <div class="stats-details">
          <span class="stats-label">Closed Revenue</span>
          <span class="stats-value">${window.CURRENCY_SYMBOL || '₹'}${totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div class="glass-panel stats-card">
        <div class="stats-icon-wrapper icon-blue">
          <i data-lucide="trending-up"></i>
        </div>
        <div class="stats-details">
          <span class="stats-label">Active Pipeline</span>
          <span class="stats-value">${window.CURRENCY_SYMBOL || '₹'}${activeDealsVal.toLocaleString()}</span>
        </div>
      </div>

      <div class="glass-panel stats-card">
        <div class="stats-icon-wrapper icon-amber">
          <i data-lucide="users"></i>
        </div>
        <div class="stats-details">
          <span class="stats-label">Total Contacts</span>
          <span class="stats-value">${contacts.length}</span>
        </div>
      </div>

      <div class="glass-panel stats-card">
        <div class="stats-icon-wrapper icon-crimson">
          <i data-lucide="check-square"></i>
        </div>
        <div class="stats-details">
          <span class="stats-label">Tasks Completed</span>
          <span class="stats-value">${taskCompletionRate}%</span>
        </div>
      </div>

    </div>

    <!-- Main Dashboard Layout Panels -->
    <div class="dashboard-layout">
      
      <!-- Charts Column -->
      <div class="dashboard-charts-column">
        
        <!-- Area Line Chart -->
        <div class="glass-panel chart-card">
          <div class="chart-header">
            <h3>Revenue Growth Forecast</h3>
            <span class="badge badge-lead">Q2 Trends</span>
          </div>
          <div class="chart-body" id="revenue-chart-container">
            <!-- Render SVG Curve Line Chart -->
          </div>
        </div>

        <!-- Donut Chart -->
        <div class="glass-panel chart-card">
          <div class="chart-header">
            <h3>Deals Stage Allocation</h3>
            <span class="badge badge-customer">Pipeline Analytics</span>
          </div>
          <div class="chart-body" id="pipeline-chart-container">
            <!-- Render SVG Donut Circle -->
          </div>
        </div>

      </div>

      <!-- Activity and Task Feed Side Column -->
      <div class="dashboard-charts-column">
        
        <!-- Incomplete Tasks Panel Widget -->
        <div class="glass-panel recent-tasks-panel">
          <h3>My Urgent Agenda</h3>
          <div class="dashboard-task-list" id="dashboard-task-list">
            ${
              quickTasks.length === 0
                ? '<div style="text-align:center;color:var(--text-tertiary);font-size:13px;padding:20px 0;">No active tasks scheduled!</div>'
                : quickTasks.map(t => {
                    const contact = contacts.find(c => c.id === t.contactId);
                    return `
                      <div class="task-item" style="padding:12px 16px;background:rgba(var(--bg-card-rgb), 0.3)">
                        <div class="task-item-left">
                          <div class="task-checkbox quick-task-chk" data-id="${t.id}">
                            <i data-lucide="check" style="width:12px;height:12px;"></i>
                          </div>
                          <div class="task-item-content">
                            <span class="task-title" style="font-size:13px;">${t.title}</span>
                            <span class="task-meta" style="font-size:11px;margin-top:2px;">
                              Due: ${t.dueDate}
                              ${contact ? `<span class="task-meta-dot"></span> <span class="open-contact-link text-accent" style="cursor:pointer;" data-id="${contact.id}">${contact.name}</span>` : ''}
                            </span>
                          </div>
                        </div>
                        <span class="priority-ring priority-${t.priority.toLowerCase()}" style="font-size:8px;padding:1px 5px;">${t.priority}</span>
                      </div>
                    `;
                  }).join('')
            }
          </div>
          <button class="btn btn-outline btn-sm btn-full" id="btn-dashboard-go-tasks">
            Go to Task Board <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>
          </button>
        </div>

        <!-- Recent Activities Feed -->
        <div class="glass-panel recent-tasks-panel">
          <h3>Global Event Feed</h3>
          <div class="timeline" style="padding-left:14px; gap: 16px;">
            ${
              recentActivities.length === 0
                ? '<div style="text-align:center;color:var(--text-tertiary);font-size:13px;padding:20px 0;">No event log actions recorded.</div>'
                : recentActivities.map(act => {
                    const contact = contacts.find(c => c.id === act.contactId);
                    const formattedDate = new Date(act.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
                    return `
                      <div class="timeline-item ${act.type}">
                        <div class="timeline-dot" style="left:-14px;width:10px;height:10px;top:2px;"></div>
                        <div class="timeline-header">
                          <span class="timeline-type" style="font-size:10px;">${act.type}</span>
                          <span class="timeline-date" style="font-size:10px;">${formattedDate}</span>
                        </div>
                        <div class="timeline-body" style="padding:8px 12px;font-size:12px;background:rgba(var(--bg-card-rgb), 0.2)">
                          ${act.content}
                          ${contact ? `<div style="margin-top:6px;font-size:10px;"><strong style="color:var(--text-tertiary)">Contact:</strong> <span class="open-contact-link text-accent" style="cursor:pointer;font-weight:600;" data-id="${contact.id}">${contact.name}</span></div>` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')
            }
          </div>
        </div>

      </div>

    </div>
  `;

  // Draw Charts
  setTimeout(() => {
    // 1. Line Chart Seed data representing revenue month by month
    // Calculate last 6 months revenue closed-won
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();
    
    // Seed standard chart mock targets if revenue is small/empty
    const chartLabels = [];
    const chartData = [12000, 19000, 15000, 24000, 38000, totalRevenue > 0 ? totalRevenue : 48000];
    
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      chartLabels.push(monthNames[m]);
    }
    
    const lineContainer = document.getElementById("revenue-chart-container");
    drawRevenueLineChart(lineContainer, chartData, chartLabels);

    // 2. Donut Chart Allocation based on Deal Stage count
    const donutContainer = document.getElementById("pipeline-chart-container");
    const stagesList = store.getPipelineStages();

    const donutSlices = stagesList.map(st => {
      const count = deals.filter(d => d.stage === st.key).length;
      return { label: st.label, count, color: st.color || "var(--accent-indigo)" };
    });

    drawDealDonutChart(donutContainer, donutSlices);
    
    // Render Icons
    lucide.createIcons();
  }, 100);

  // --- Bind Interactive View Switch Links ---
  
  // Tasks checkbox toggles in dashboard quick card
  container.querySelectorAll('.quick-task-chk').forEach(chk => {
    chk.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = chk.getAttribute('data-id');
      store.toggleTaskCompleted(taskId);
      // Reload Dashboard
      renderDashboard(container, store, navigateToView);
      
      // Send a quick toast alert
      const updated = store.getTasks().find(t => t.id === taskId);
      window.dispatchEvent(new CustomEvent('crm-alert', {
        detail: {
          type: updated.completed ? 'success' : 'warning',
          message: updated.completed ? 'Agenda Task Completed!' : 'Task re-opened.'
        }
      }));
    });
  });

  // Contact Drawer triggers on links
  container.querySelectorAll('.open-contact-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const contactId = link.getAttribute('data-id');
      window.dispatchEvent(new CustomEvent('crm-open-contact-drawer', {
        detail: { contactId }
      }));
    });
  });

  // Navigate to task board
  document.getElementById('btn-dashboard-go-tasks').addEventListener('click', () => {
    navigateToView('tasks');
  });
}
