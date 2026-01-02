// ============================================
// ADMIN PANEL SPECIFIC SCRIPT
// ============================================

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
        
        // Check if user is logged in
        const authToken = localStorage.getItem('admin_token');
        if (!authToken && !window.location.pathname.includes('/login')) {
            window.location.href = '/admin/login';
        }
    }

    checkAuth() {
        const token = localStorage.getItem('admin_token');
        if (token) {
            // Verify token with server
            this.verifyToken(token);
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/admin/verify-token', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                this.isAuthenticated = true;
                const userData = await response.json();
                this.currentUser = userData;
                this.updateUI();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    }

    async login(username, password) {
        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('admin_token', data.token);
                this.isAuthenticated = true;
                this.currentUser = data.user;
                window.location.href = '/admin';
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            throw error;
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        this.isAuthenticated = false;
        this.currentUser = null;
        window.location.href = '/admin/login';
    }

    updateUI() {
        // Update user info in UI
        const userElement = document.getElementById('currentUser');
        if (userElement && this.currentUser) {
            userElement.textContent = this.currentUser.username;
        }
    }

    async loadDashboardData() {
        if (!this.isAuthenticated) return;
        
        await Promise.all([
            this.loadStats(),
            this.loadRecentActivity(),
            this.loadSystemStatus()
        ]);
    }

    async loadStats() {
        try {
            const response = await fetch('/admin/stats');
            if (response.ok) {
                const stats = await response.json();
                this.updateStats(stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStats(stats) {
        const statsElements = {
            'totalUsers': stats.total_users || 0,
            'activeServers': stats.active_servers || 0,
            'totalDownloads': stats.total_downloads || 0,
            'todayDownloads': stats.today_downloads || 0
        };
        
        Object.keys(statsElements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                // Animate number counting
                this.animateCounter(element, statsElements[key]);
            }
        });
    }

    animateCounter(element, target) {
        const current = parseInt(element.textContent) || 0;
        const increment = target > current ? 1 : -1;
        const step = Math.abs(target - current) / 50;
        
        let currentValue = current;
        const timer = setInterval(() => {
            currentValue += increment * step;
            
            if ((increment > 0 && currentValue >= target) || 
                (increment < 0 && currentValue <= target)) {
                currentValue = target;
                clearInterval(timer);
            }
            
            element.textContent = Math.round(currentValue).toLocaleString();
        }, 20);
    }

    async loadRecentActivity() {
        try {
            const response = await fetch('/admin/activity');
            if (response.ok) {
                const activities = await response.json();
                this.updateActivityLog(activities);
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }

    updateActivityLog(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        activityList.innerHTML = '';
        
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.message}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    }

    getActivityIcon(type) {
        const icons = {
            'login': 'sign-in-alt',
            'logout': 'sign-out-alt',
            'download': 'download',
            'config': 'cog',
            'video': 'video',
            'user': 'user'
        };
        
        return icons[type] || 'info-circle';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/admin/system-status');
            if (response.ok) {
                const status = await response.json();
                this.updateSystemStatus(status);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    updateSystemStatus(status) {
        const cpuElement = document.getElementById('cpuUsage');
        const memoryElement = document.getElementById('memoryUsage');
        const diskElement = document.getElementById('diskUsage');
        
        if (cpuElement) cpuElement.textContent = `${status.cpu || 0}%`;
        if (memoryElement) memoryElement.textContent = `${status.memory || 0}%`;
        if (diskElement) diskElement.textContent = `${status.disk || 0}%`;
        
        // Update progress bars
        this.updateProgressBar('cpuProgress', status.cpu || 0);
        this.updateProgressBar('memoryProgress', status.memory || 0);
        this.updateProgressBar('diskProgress', status.disk || 0);
    }

    updateProgressBar(elementId, percentage) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.width = `${percentage}%`;
            element.style.backgroundColor = this.getProgressColor(percentage);
        }
    }

    getProgressColor(percentage) {
        if (percentage < 50) return '#4CAF50';
        if (percentage < 80) return '#FFC107';
        return '#F44336';
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
                this.showNotification('Dashboard refreshed', 'success');
            });
        }
        
        // Form submissions
        const forms = document.querySelectorAll('form[data-submit]');
        forms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFormSubmit(form);
            });
        });
        
        // Modal handling
        this.setupModals();
        
        // Tab switching
        this.setupTabs();
    }

    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const action = form.dataset.submit;
        
        try {
            const response = await fetch(`/admin/${action}`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message || 'Operation successful', 'success');
                
                // Refresh data if needed
                if (action === 'config') {
                    this.loadDashboardData();
                }
                
                // Reset form if it has reset attribute
                if (form.hasAttribute('data-reset')) {
                    form.reset();
                }
            } else {
                throw new Error('Operation failed');
            }
        } catch (error) {
            this.showNotification('Operation failed: ' + error.message, 'error');
        }
    }

    setupModals() {
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}Tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `admin-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        `;
        
        // Add to notification container
        const container = document.getElementById('notificationContainer') || 
                         document.body;
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        // Close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});

// ============================================
// FILE UPLOAD HANDLING
// ============================================
function handleFileUpload(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    
    const preview = document.getElementById(previewId);
    if (!preview) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (preview.tagName === 'IMG') {
            preview.src = e.target.result;
        } else {
            preview.style.backgroundImage = `url(${e.target.result})`;
        }
        preview.classList.add('has-image');
    };
    
    reader.readAsDataURL(file);
}

// ============================================
// DATA TABLE FUNCTIONS
// ============================================
function initDataTable(tableId, options = {}) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    // Add search functionality
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search...';
    searchInput.className = 'table-search';
    searchInput.style.marginBottom = '10px';
    searchInput.style.padding = '8px';
    searchInput.style.width = '100%';
    searchInput.style.boxSizing = 'border-box';
    
    table.parentNode.insertBefore(searchInput, table);
    
    searchInput.addEventListener('keyup', () => {
        const filter = searchInput.value.toLowerCase();
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    });
    
    // Add pagination if needed
    if (options.pagination) {
        addPagination(table, options.itemsPerPage || 10);
    }
}

function addPagination(table, itemsPerPage) {
    const rows = table.querySelectorAll('tbody tr');
    const pageCount = Math.ceil(rows.length / itemsPerPage);
    
    if (pageCount <= 1) return;
    
    // Create pagination container
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    pagination.style.marginTop = '20px';
    pagination.style.textAlign = 'center';
    
    // Add page buttons
    for (let i = 1; i <= pageCount; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = 'page-btn';
        pageBtn.dataset.page = i;
        
        if (i === 1) {
            pageBtn.classList.add('active');
        }
        
        pageBtn.addEventListener('click', () => {
            showPage(i, rows, itemsPerPage);
            
            // Update active button
            pagination.querySelectorAll('.page-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            pageBtn.classList.add('active');
        });
        
        pagination.appendChild(pageBtn);
    }
    
    table.parentNode.appendChild(pagination);
    
    // Show first page initially
    showPage(1, rows, itemsPerPage);
}

function showPage(pageNumber, rows, itemsPerPage) {
    const start = (pageNumber - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    
    rows.forEach((row, index) => {
        row.style.display = (index >= start && index < end) ? '' : 'none';
    });
}

// ============================================
// CHARTS AND GRAPHS
// ============================================
function initChart(chartId, type, data, options = {}) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    const chart = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: options.title || ''
                }
            },
            ...options
        }
    });
    
    return chart;
}

// ============================================
// REAL-TIME UPDATES
// ============================================
function startRealTimeUpdates() {
    // Simulate real-time updates for demo
    setInterval(() => {
        if (window.adminPanel && window.adminPanel.isAuthenticated) {
            // Update random stats
            const stats = {
                todayDownloads: Math.floor(Math.random() * 100),
                activeUsers: Math.floor(Math.random() * 1000),
                serverLoad: Math.floor(Math.random() * 100)
            };
            
            // Update UI
            Object.keys(stats).forEach(stat => {
                const element = document.getElementById(stat);
                if (element) {
                    element.textContent = stats[stat];
                }
            });
        }
    }, 10000); // Update every 10 seconds
}

// Start real-time updates
if (document.getElementById('dashboardPage')) {
    startRealTimeUpdates();
}