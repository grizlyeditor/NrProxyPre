// ============================================
// MAIN APPLICATION SCRIPT
// ============================================

class ProxyApp {
    constructor() {
        this.regions = ["PK", "IND", "US", "UK", "DE", "FR", "BR", "RU", "JP", "KR"];
        this.currentRegionIndex = 0;
        this.autoUpdateInterval = null;
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.apiBaseUrl = window.location.origin;
        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    init() {
        this.setupTheme();
        this.setupEventListeners();
        this.startAutoUpdates();
        this.loadServerStatus();
        this.setupVideoPlayers();
        
        // Check if we're on download page
        if (document.getElementById('activationCode')) {
            this.generateActivationCode();
            this.loadProxyConfig();
        }
        
        // Check if we're on admin page
        if (document.getElementById('adminTitle')) {
            this.setupAdminPanel();
        }
        
        console.log('Free Fire Proxy App initialized');
    }

    // ============================================
    // THEME MANAGEMENT
    // ============================================
    setupTheme() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);
        
        // Setup theme toggle buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme || e.target.textContent.toLowerCase();
                this.changeTheme(theme);
            });
            
            // Set active state
            if (btn.textContent.toLowerCase() === this.currentTheme) {
                btn.classList.add('active');
            }
        });
    }

    applyTheme(theme) {
        document.body.className = '';
        document.body.classList.add(`${theme}-theme`);
        localStorage.setItem('theme', theme);
        
        // Update active button state
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase() === theme) {
                btn.classList.add('active');
            }
        });
    }

    changeTheme(theme) {
        if (theme !== this.currentTheme) {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.showNotification('Theme changed', 'success');
        }
    }

    // ============================================
    // REGION ROTATION
    // ============================================
    updateRegion() {
        const regionElement = document.getElementById('regionDisplay');
        if (!regionElement) return;
        
        const region = this.regions[this.currentRegionIndex];
        regionElement.textContent = region;
        
        // Add animation effect
        regionElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            regionElement.style.transform = 'scale(1)';
        }, 150);
        
        this.currentRegionIndex = (this.currentRegionIndex + 1) % this.regions.length;
    }

    startAutoUpdates() {
        // Update region every second
        setInterval(() => {
            this.updateRegion();
        }, 1000);
        
        // Update status every 5 seconds
        setInterval(() => {
            this.loadServerStatus();
        }, 5000);
    }

    // ============================================
    // SERVER STATUS
    // ============================================
    async loadServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/status`);
            if (response.ok) {
                const status = await response.json();
                this.updateStatusDisplay(status);
            }
        } catch (error) {
            console.error('Error loading server status:', error);
        }
    }

    updateStatusDisplay(status) {
        // Update status elements
        const statusElements = {
            'serverStatus': status.status || 'Online',
            'activePlayers': status.players || '1,234',
            'serverUptime': status.uptime || '99.8%'
        };
        
        Object.keys(statusElements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = statusElements[key];
                
                // Add status class for color coding
                if (key === 'serverStatus') {
                    element.className = 'status-value ' + 
                        (statusElements[key].toLowerCase() === 'online' ? 'status-online' : 'status-offline');
                }
            }
        });
    }

    // ============================================
    // VIDEO PLAYER
    // ============================================
    setupVideoPlayers() {
        document.querySelectorAll('.play-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.playVideo(e.target.closest('.video-card'));
            });
        });
    }

    playVideo(videoCard) {
        const thumbnail = videoCard.querySelector('.video-thumbnail');
        const videoFrame = videoCard.querySelector('.video-frame');
        const playBtn = videoCard.querySelector('.play-video-btn');
        
        if (thumbnail && videoFrame) {
            thumbnail.style.display = 'none';
            videoFrame.style.display = 'block';
            
            if (playBtn) {
                playBtn.style.display = 'none';
            }
            
            // Auto-play the video
            const iframe = videoFrame.querySelector('iframe');
            if (iframe) {
                const src = iframe.src;
                if (!src.includes('autoplay=1')) {
                    iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
                }
            }
        }
    }

    // ============================================
    // ACTIVATION CODE
    // ============================================
    generateActivationCode() {
        const codeElement = document.getElementById('activationCode');
        if (!codeElement) return;
        
        // Check if code already exists in session
        let code = sessionStorage.getItem('activationCode');
        
        if (!code) {
            // Generate new code
            const prefix = ['AB', 'CD', 'EF', 'GH'][Math.floor(Math.random() * 4)];
            const numbers = Math.floor(100000 + Math.random() * 900000).toString();
            const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
            code = `${prefix}${numbers}${suffix}`;
            
            sessionStorage.setItem('activationCode', code);
        }
        
        codeElement.textContent = code;
        
        // Add copy functionality
        codeElement.style.cursor = 'pointer';
        codeElement.title = 'Click to copy';
        codeElement.addEventListener('click', () => {
            this.copyToClipboard(code);
        });
    }

    // ============================================
    // PROXY CONFIGURATION
    // ============================================
    async loadProxyConfig() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/config`);
            if (response.ok) {
                const config = await response.json();
                this.updateConfigForm(config);
            }
        } catch (error) {
            console.error('Error loading proxy config:', error);
        }
    }

    updateConfigForm(config) {
        const ipInput = document.getElementById('proxyIp');
        const portInput = document.getElementById('proxyPort');
        
        if (ipInput) ipInput.value = config.ip || '192.168.1.1';
        if (portInput) portInput.value = config.port || '8080';
        
        // Update bottom navigation
        const navIp = document.querySelector('.nav-ip');
        if (navIp) {
            navIp.textContent = `IP: ${config.ip || '192.168.1.1'} | Port: ${config.port || '8080'}`;
        }
    }

    async saveConfig() {
        const ip = document.getElementById('proxyIp')?.value;
        const port = document.getElementById('proxyPort')?.value;
        
        if (!ip || !port) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ip, port })
            });
            
            if (response.ok) {
                this.showNotification('Configuration saved successfully!', 'success');
                this.loadProxyConfig(); // Refresh config
            } else {
                this.showNotification('Error saving configuration', 'error');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            this.showNotification('Error saving configuration', 'error');
        }
    }

    // ============================================
    // DOWNLOAD FUNCTIONALITY
    // ============================================
    setupDownloadButton() {
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Show loading state
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<span class="loading"></span> Downloading...';
                downloadBtn.disabled = true;
                
                try {
                    // Get download link from server
                    const response = await fetch(`${this.apiBaseUrl}/api/download-link`);
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.link) {
                            // Create temporary download link
                            const link = document.createElement('a');
                            link.href = data.link;
                            link.download = 'FreeFire_Proxy.apk';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            this.showNotification('Download started!', 'success');
                        } else {
                            this.showNotification('Download link not available', 'error');
                        }
                    }
                } catch (error) {
                    console.error('Download error:', error);
                    this.showNotification('Download failed', 'error');
                } finally {
                    // Restore button state
                    setTimeout(() => {
                        downloadBtn.innerHTML = originalText;
                        downloadBtn.disabled = false;
                    }, 2000);
                }
            });
        }
    }

    // ============================================
    // ADMIN PANEL
    // ============================================
    setupAdminPanel() {
        this.setupAdminForms();
        this.loadAdminData();
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logoutAdmin();
            });
        }
    }

    async loadAdminData() {
        await this.loadVideos();
        await this.loadAdminConfig();
    }

    async loadVideos() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/videos`);
            if (response.ok) {
                const videos = await response.json();
                this.renderVideoList(videos);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    }

    renderVideoList(videos) {
        const videoList = document.getElementById('videoList');
        if (!videoList) return;
        
        videoList.innerHTML = '';
        
        if (!videos || videos.length === 0) {
            videoList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5);">No videos added yet</p>';
            return;
        }
        
        videos.forEach(video => {
            const videoItem = document.createElement('div');
            videoItem.className = 'video-item';
            videoItem.innerHTML = `
                <div>
                    <div class="video-title">${video.title || 'Untitled Video'}</div>
                    <small style="color: rgba(255,255,255,0.6);">Order: ${video.order || 1}</small>
                </div>
                <div class="video-actions">
                    <button class="btn btn-small edit-video-btn" data-id="${video.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-small btn-danger delete-video-btn" data-id="${video.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            videoList.appendChild(videoItem);
        });
        
        // Add event listeners
        this.setupVideoActions();
    }

    setupVideoActions() {
        // Edit buttons
        document.querySelectorAll('.edit-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.target.closest('button').dataset.id;
                this.editVideo(videoId);
            });
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-video-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = e.target.closest('button').dataset.id;
                this.deleteVideo(videoId);
            });
        });
    }

    async loadAdminConfig() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/config`);
            if (response.ok) {
                const config = await response.json();
                
                // Populate form fields
                Object.keys(config).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) {
                        input.value = config[key];
                    }
                });
            }
        } catch (error) {
            console.error('Error loading admin config:', error);
        }
    }

    async saveAdminConfig() {
        const config = {
            downloadLink: document.getElementById('downloadLink')?.value,
            proxyIp: document.getElementById('proxyIp')?.value,
            proxyPort: document.getElementById('proxyPort')?.value,
            serverStatus: document.querySelector('input[name="serverStatus"]:checked')?.value
        };
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            if (response.ok) {
                this.showNotification('Configuration saved successfully!', 'success');
            } else {
                this.showNotification('Error saving configuration', 'error');
            }
        } catch (error) {
            console.error('Error saving admin config:', error);
            this.showNotification('Error saving configuration', 'error');
        }
    }

    setupAdminForms() {
        // Save config button
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveAdminConfig();
            });
        }
        
        // Add video button
        const addVideoBtn = document.getElementById('addVideoBtn');
        if (addVideoBtn) {
            addVideoBtn.addEventListener('click', () => {
                this.showVideoModal();
            });
        }
        
        // Modal close button
        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideVideoModal();
            });
        }
        
        // Save video button
        const saveVideoBtn = document.getElementById('saveVideoBtn');
        if (saveVideoBtn) {
            saveVideoBtn.addEventListener('click', () => {
                this.saveVideo();
            });
        }
    }

    showVideoModal(video = null) {
        const modal = document.getElementById('videoModal');
        if (!modal) return;
        
        if (video) {
            // Edit mode
            document.getElementById('videoId').value = video.id;
            document.getElementById('videoTitle').value = video.title;
            document.getElementById('videoUrl').value = video.url;
            document.getElementById('videoThumbnail').value = video.thumbnail;
            document.getElementById('videoOrder').value = video.order || 1;
            document.getElementById('modalTitle').textContent = 'Edit Video';
        } else {
            // Add mode
            document.getElementById('videoId').value = '';
            document.getElementById('videoTitle').value = '';
            document.getElementById('videoUrl').value = '';
            document.getElementById('videoThumbnail').value = '';
            document.getElementById('videoOrder').value = 1;
            document.getElementById('modalTitle').textContent = 'Add Video';
        }
        
        modal.style.display = 'flex';
    }

    hideVideoModal() {
        const modal = document.getElementById('videoModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async saveVideo() {
        const videoId = document.getElementById('videoId').value;
        const videoData = {
            title: document.getElementById('videoTitle').value,
            url: document.getElementById('videoUrl').value,
            thumbnail: document.getElementById('videoThumbnail').value,
            order: parseInt(document.getElementById('videoOrder').value)
        };
        
        if (!videoData.title || !videoData.url) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const url = videoId ? 
                `${this.apiBaseUrl}/admin/videos/${videoId}` : 
                `${this.apiBaseUrl}/admin/videos`;
                
            const response = await fetch(url, {
                method: videoId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(videoData)
            });
            
            if (response.ok) {
                this.showNotification('Video saved successfully!', 'success');
                this.hideVideoModal();
                this.loadVideos();
            } else {
                this.showNotification('Error saving video', 'error');
            }
        } catch (error) {
            console.error('Error saving video:', error);
            this.showNotification('Error saving video', 'error');
        }
    }

    async editVideo(videoId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/videos/${videoId}`);
            if (response.ok) {
                const video = await response.json();
                this.showVideoModal(video);
            }
        } catch (error) {
            console.error('Error loading video:', error);
        }
    }

    async deleteVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/videos/${videoId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('Video deleted successfully!', 'success');
                this.loadVideos();
            } else {
                this.showNotification('Error deleting video', 'error');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showNotification('Error deleting video', 'error');
        }
    }

    logoutAdmin() {
        // Clear admin session
        fetch(`${this.apiBaseUrl}/admin/logout`, {
            method: 'POST'
        }).then(() => {
            window.location.href = '/admin/login';
        });
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showNotification('Copy failed', 'error');
        });
    }

    setupEventListeners() {
        // Prevent double tap zoom on mobile
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Handle config save button
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.saveConfig());
        }
        
        // Handle download button
        this.setupDownloadButton();
        
        // Handle QR code refresh
        const refreshQrBtn = document.getElementById('refreshQrBtn');
        if (refreshQrBtn) {
            refreshQrBtn.addEventListener('click', () => {
                this.refreshQRCode();
            });
        }
    }

    async refreshQRCode() {
        const qrImage = document.querySelector('.qr-code img');
        if (qrImage) {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            qrImage.src = `${this.apiBaseUrl}/qr-code?t=${timestamp}`;
        }
    }
}

// ============================================
// INITIALIZE APP WHEN DOM IS LOADED
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    window.proxyApp = new ProxyApp();
});

// ============================================
// FIREBASE FUNCTIONS (for admin panel)
// ============================================
const firebaseConfig = {
    apiKey: "1:612166184659:android:1d117840c0a65bd19b6e26",
    authDomain: "ejene-d8ff7.firebaseapp.com",
    projectId: "ejene-d8ff7",
    storageBucket: "ejene-d8ff7.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    const storage = firebase.storage();
}

// ============================================
// ADMIN LOGIN
// ============================================
async function adminLogin(username, password) {
    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: 'Invalid credentials' };
        }
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

// ============================================
// SERVICE WORKER FOR OFFLINE SUPPORT
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registered:', registration);
        }).catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}