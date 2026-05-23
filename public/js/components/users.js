// users.js - Admin User Administration Control Panel View Module

window.renderUsers = function(container, store, users = []) {
  if (!container) return;

  const currentUser = store.getCurrentUser();

  container.innerHTML = `
    <div class="toolbar-actions">
      <div class="toolbar-filters">
        <h2 style="font-family:var(--font-title);font-size:18px;font-weight:600;display:flex;align-items:center;gap:8px;">
          <i data-lucide="shield-check" style="color:var(--accent-indigo);"></i> Abilix CRM - User Account Administration
        </h2>
      </div>
      <button class="btn btn-primary" id="btn-add-user">
        <i data-lucide="user-plus"></i> Add New User
      </button>
    </div>

    <div class="table-wrapper">
      <table class="contacts-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Username</th>
            <th>Security Role</th>
            <th>Created Date</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody id="users-table-body">
          ${users.map(u => {
            const formattedDate = new Date(u.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const isSelf = currentUser && currentUser.username === u.username;
            const badgeClass = u.role === 'admin' ? 'badge-evangelist' : 'badge-lead';
            const roleLabel = u.role === 'admin' ? 'Administrator' : 'Classic User';
            
            return `
              <tr style="cursor:default;">
                <td>
                  <div class="contact-name-cell">
                    <div class="contact-avatar-circle" style="background:${u.role === 'admin' ? 'rgba(var(--indigo-hsl), 0.1)' : 'rgba(var(--emerald-hsl), 0.1)'};color:${u.role === 'admin' ? 'var(--accent-indigo)' : 'var(--accent-emerald)'}">
                      ${(u.name || 'User').split(' ').map(n=>n ? n[0] : '').join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-weight:600;color:var(--text-primary);">${u.name || u.username} ${isSelf ? '<span style="font-size:10px;color:var(--text-tertiary);margin-left:4px;">(You)</span>' : ''}</div>
                    </div>
                  </div>
                </td>
                <td><code style="font-size:12px;color:var(--text-secondary);background:rgba(var(--border-rgb), 0.04);padding:2px 6px;border-radius:4px;">${u.username}</code></td>
                <td><span class="badge ${badgeClass}">${roleLabel}</span></td>
                <td><span style="color:var(--text-secondary);">${formattedDate}</span></td>
                <td style="text-align:right;">
                  ${isSelf ? `
                    <span style="font-size:11px;color:var(--text-tertiary);font-style:italic;">Active Session</span>
                  ` : `
                    <button class="btn btn-outline btn-sm btn-delete-user text-accent-crimson" data-username="${u.username}" title="Delete User Account" style="color:var(--accent-crimson);border-color:rgba(239,68,68,0.2);height:32px;display:inline-flex;align-items:center;gap:6px;">
                      <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete
                    </button>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Bind new user modal trigger
  document.getElementById("btn-add-user").addEventListener("click", () => {
    document.getElementById("user-modal").classList.add("active");
  });

  // Bind delete buttons
  container.querySelectorAll(".btn-delete-user").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const username = btn.getAttribute("data-username");
      const matched = users.find(u => u.username === username);
      if (!matched) return;

      const confirmMsg = `Are you sure you want to permanently delete user account "${matched.name}" (@${matched.username})?\n\nThis will instantly wipe their isolated database and clean up all deals, contacts, tasks, activity logs, and custom pipelines associated with their workspace!`;
      
      if (confirm(confirmMsg)) {
        store.deleteUser(username).then((success) => {
          if (success) {
            // Re-fetch users asynchronously and re-render
            store.getUsers().then(freshUsers => {
              window.renderUsers(container, store, freshUsers);
              
              // Notify with alert
              window.dispatchEvent(new CustomEvent('crm-alert', {
                detail: { type: 'danger', message: `User "${matched.name}" account deleted successfully.` }
              }));
            });
          }
        });
      }
    });
  });

  // Render lucide icons
  lucide.createIcons();
};
