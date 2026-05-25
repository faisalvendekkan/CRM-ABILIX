// store.js - Client-Side Scoped Memory Cache & Async Server API Synchronization Store

window.CRMStore = class CRMStore {
  constructor() {
    this.keyPrefix = "hubspot_crm_";
    this.cache = {
      contacts: [],
      deals: [],
      tasks: [],
      activities: [],
      stages: [],
      theme: 'dark'
    };
  }

  // --- Session Token Operations ---
  getCurrentUser() {
    return JSON.parse(localStorage.getItem(this.keyPrefix + "current_user"));
  }

  getSessionToken() {
    return localStorage.getItem(this.keyPrefix + "jwt");
  }

  // --- Async Session Loader ---
  async loadSession() {
    const token = this.getSessionToken();
    if (!token) return;

    try {
      const response = await fetch('/api/workspace', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        this.cache.contacts = data.contacts;
        this.cache.deals = data.deals;
        this.cache.tasks = data.tasks;
        this.cache.activities = data.activities;
        this.cache.stages = data.stages;
        this.cache.theme = data.theme;
        
        // Propagate theme immediately
        document.documentElement.setAttribute("data-theme", this.cache.theme);
      } else {
        // Session expired or invalid
        this.logout();
      }
    } catch (e) {
      console.error("abilix-store: Failed to sync with server. Falling back to local memory.", e);
    }
  }

  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(this.keyPrefix + "jwt", data.token);
        localStorage.setItem(this.keyPrefix + "current_user", JSON.stringify(data.user));
        await this.loadSession(); // Boot scope caching
        return true;
      }
    } catch (e) {
      console.error("abilix-store: Authentication fetch error", e);
    }
    return false;
  }

  logout() {
    localStorage.removeItem(this.keyPrefix + "jwt");
    localStorage.removeItem(this.keyPrefix + "current_user");
    this.cache = { contacts: [], deals: [], tasks: [], activities: [], stages: [], theme: 'dark' };
  }

  // --- Scoped Theme ---
  getTheme() {
    return this.cache.theme || "dark";
  }

  async setTheme(theme) {
    this.cache.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    
    try {
      await fetch('/api/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify({ value: theme })
      });
    } catch (e) {
      console.error("abilix-store: Theme save failed", e);
    }
  }

  // --- Scoped Contacts ---
  getContacts() {
    return this.cache.contacts || [];
  }

  getContact(id) {
    return this.getContacts().find(c => c.id === id);
  }

  async addContact(contact) {
    const newContact = {
      id: "c-" + Date.now(),
      createdAt: new Date().toISOString(),
      owner: this.getCurrentUser()?.name || "Faisal",
      value: contact.value ? parseFloat(contact.value) : 0,
      ...contact
    };
    
    // 1. Instantly write to memory cache (Optimistic UI)
    this.cache.contacts.push(newContact);
    
    this.addActivity({
      id: "a-c-" + Date.now(),
      type: "Note",
      content: `New Contact Created: ${newContact.name} at ${newContact.company}`,
      contactId: newContact.id
    });

    // 2. Synchronize in the background permanently
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify(newContact)
      });
    } catch (e) {
      console.error("abilix-store: Sync contact save failed", e);
    }

    return newContact;
  }

  async updateContact(id, updatedFields) {
    const index = this.cache.contacts.findIndex(c => c.id === id);
    if (index !== -1) {
      this.cache.contacts[index] = { ...this.cache.contacts[index], ...updatedFields };
      if (updatedFields.value) this.cache.contacts[index].value = parseFloat(updatedFields.value);

      try {
        await fetch(`/api/contacts/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getSessionToken()}`
          },
          body: JSON.stringify(this.cache.contacts[index])
        });
      } catch (e) {
        console.error("abilix-store: Sync contact update failed", e);
      }
      return this.cache.contacts[index];
    }
    return null;
  }

  async deleteContact(id) {
    this.cache.contacts = this.cache.contacts.filter(c => c.id !== id);
    this.cache.deals = this.cache.deals.filter(d => d.contactId !== id);
    this.cache.tasks = this.cache.tasks.filter(t => t.contactId !== id);
    this.cache.activities = this.cache.activities.filter(a => a.contactId !== id);

    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });
    } catch (e) {
      console.error("abilix-store: Sync contact delete failed", e);
    }
  }

  // --- Scoped Deals ---
  getDeals() {
    return this.cache.deals || [];
  }

  getDeal(id) {
    return this.getDeals().find(d => d.id === id);
  }

  async addDeal(deal) {
    const newDeal = {
      id: "d-" + Date.now(),
      createdAt: new Date().toISOString(),
      value: parseFloat(deal.value) || 0,
      ...deal
    };
    
    this.cache.deals.push(newDeal);
    
    const matchedStage = this.getPipelineStages().find(s => s.key === newDeal.stage);
    const stageLabel = matchedStage ? matchedStage.label : newDeal.stage.replace(/-/g, ' ');

    this.addActivity({
      id: "a-d-" + Date.now(),
      type: "Deal Created",
      content: `Deal "${newDeal.name}" (${window.CURRENCY_SYMBOL || '₹'}${newDeal.value.toLocaleString()}) created in stage "${stageLabel}"`,
      contactId: newDeal.contactId,
      dealId: newDeal.id
    });

    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify(newDeal)
      });
    } catch (e) {
      console.error("abilix-store: Sync deal save failed", e);
    }
    return newDeal;
  }

  async updateDealStage(dealId, newStage) {
    const deal = this.cache.deals.find(d => d.id === dealId);
    if (deal) {
      const oldStage = deal.stage;
      deal.stage = newStage;
      
      const stages = this.getPipelineStages();
      const matchedOld = stages.find(s => s.key === oldStage);
      const matchedNew = stages.find(s => s.key === newStage);
      const oldLabel = matchedOld ? matchedOld.label : oldStage.replace(/-/g, ' ');
      const newLabel = matchedNew ? matchedNew.label : newStage.replace(/-/g, ' ');

      this.addActivity({
        id: "a-d-mv-" + Date.now(),
        type: "Deal Moved",
        content: `Deal "${deal.name}" moved from "${oldLabel}" to "${newLabel}"`,
        contactId: deal.contactId,
        dealId: deal.id
      });

      try {
        await fetch(`/api/deals/${dealId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getSessionToken()}`
          },
          body: JSON.stringify(deal)
        });
      } catch (e) {
        console.error("abilix-store: Sync deal stage update failed", e);
      }
      return deal;
    }
    return null;
  }

  async updateDeal(id, updatedFields) {
    const index = this.cache.deals.findIndex(d => d.id === id);
    if (index !== -1) {
      const oldStage = this.cache.deals[index].stage;
      this.cache.deals[index] = { ...this.cache.deals[index], ...updatedFields };
      if (updatedFields.value) this.cache.deals[index].value = parseFloat(updatedFields.value);

      if (updatedFields.stage && updatedFields.stage !== oldStage) {
        const stages = this.getPipelineStages();
        const matchedOld = stages.find(s => s.key === oldStage);
        const matchedNew = stages.find(s => s.key === updatedFields.stage);
        const oldLabel = matchedOld ? matchedOld.label : oldStage.replace(/-/g, ' ');
        const newLabel = matchedNew ? matchedNew.label : updatedFields.stage.replace(/-/g, ' ');

        this.addActivity({
          id: "a-d-mv-" + Date.now(),
          type: "Deal Moved",
          content: `Deal "${this.cache.deals[index].name}" moved from "${oldLabel}" to "${newLabel}"`,
          contactId: this.cache.deals[index].contactId,
          dealId: id
        });
      }

      try {
        await fetch(`/api/deals/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getSessionToken()}`
          },
          body: JSON.stringify(this.cache.deals[index])
        });
      } catch (e) {
        console.error("abilix-store: Sync deal update failed", e);
      }
      return this.cache.deals[index];
    }
    return null;
  }

  async deleteDeal(id) {
    const deal = this.cache.deals.find(d => d.id === id);
    this.cache.deals = this.cache.deals.filter(d => d.id !== id);

    if (deal) {
      this.addActivity({
        id: "a-d-del-" + Date.now(),
        type: "Note",
        content: `Deal "${deal.name}" (${window.CURRENCY_SYMBOL || '₹'}${deal.value.toLocaleString()}) was deleted`,
        contactId: deal.contactId
      });
    }

    try {
      await fetch(`/api/deals/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });
    } catch (e) {
      console.error("abilix-store: Sync deal delete failed", e);
    }
  }

  // --- Scoped Tasks ---
  getTasks() {
    return this.cache.tasks || [];
  }

  async addTask(task) {
    const newTask = {
      id: "t-" + Date.now(),
      createdAt: new Date().toISOString(),
      completed: false,
      ...task
    };
    
    this.cache.tasks.push(newTask);

    this.addActivity({
      id: "a-t-" + Date.now(),
      type: "Note",
      content: `Task Scheduled: "${newTask.title}" (Priority: ${newTask.priority}, Due: ${newTask.dueDate})`,
      contactId: newTask.contactId
    });

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify(newTask)
      });
    } catch (e) {
      console.error("abilix-store: Sync task save failed", e);
    }
    return newTask;
  }

  async toggleTaskCompleted(id) {
    const task = this.cache.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      
      this.addActivity({
        id: "a-t-comp-" + Date.now(),
        type: "Note",
        content: `Task ${task.completed ? 'Completed' : 'Re-opened'}: "${task.title}"`,
        contactId: task.contactId
      });

      try {
        await fetch(`/api/tasks/${id}/toggle`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.getSessionToken()}`
          }
        });
      } catch (e) {
        console.error("abilix-store: Sync task toggle failed", e);
      }
      return task;
    }
    return null;
  }

  async deleteTask(id) {
    this.cache.tasks = this.cache.tasks.filter(t => t.id !== id);

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });
    } catch (e) {
      console.error("abilix-store: Sync task delete failed", e);
    }
  }

  // --- Scoped Activities ---
  getActivities() {
    return this.cache.activities || [];
  }

  getActivitiesForContact(contactId) {
    return this.getActivities()
      .filter(a => a.contactId === contactId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async addActivity(activity) {
    const newActivity = {
      id: activity.id || "a-" + Date.now(),
      createdAt: new Date().toISOString(),
      ...activity
    };
    this.cache.activities.push(newActivity);

    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify(newActivity)
      });
    } catch (e) {
      console.error("abilix-store: Sync activity log failed", e);
    }
    return newActivity;
  }

  // --- Scoped Pipeline Stages ---
  getPipelineStages() {
    return this.cache.stages || [];
  }

  async savePipelineStages(stages) {
    this.cache.stages = stages.map((stage, index) => ({
      ...stage,
      color: window.normalizeStageColor ? window.normalizeStageColor(stage.color) : stage.color,
      position: index
    }));

    // Local Cache Migration
    const firstStageKey = this.cache.stages[0]?.key || "appointment-scheduled";
    this.cache.deals.forEach(deal => {
      const stageExists = this.cache.stages.some(st => st.key === deal.stage);
      if (!stageExists) {
        deal.stage = firstStageKey;
      }
    });

    try {
      await fetch('/api/stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify({ stages: this.cache.stages })
      });
    } catch (e) {
      console.error("abilix-store: Sync stages save failed", e);
    }
  }

  // --- User Administration (Admin Exclusive) ---
  async getUsers() {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("abilix-store: Admin list users failed", e);
    }
    return [];
  }

  async addUser(user) {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSessionToken()}`
        },
        body: JSON.stringify(user)
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("abilix-store: Admin add user failed", e);
    }
    return null;
  }

  async deleteUser(username) {
    try {
      const response = await fetch(`/api/admin/users/${username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getSessionToken()}`
        }
      });
      if (response.ok) {
        return true;
      }
    } catch (e) {
      console.error("abilix-store: Admin delete user failed", e);
    }
    return false;
  }
}
