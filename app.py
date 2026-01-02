from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import firebase_admin
from firebase_admin import credentials, firestore, storage
import json
import os
import pyqrcode
from io import BytesIO
from datetime import datetime
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Firebase initialization
try:
    cred = credentials.Certificate('firebase_config.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'ejene-d8ff7.appspot.com'
    })
    db = firestore.client()
    bucket = storage.bucket()
    print("✅ Firebase initialized successfully")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    db = None
    bucket = None

# Admin credentials (you should change these)
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# Regions for rotating display
REGIONS = ["PK", "IND", "US", "UK", "DE", "FR", "BR", "RU", "JP", "KR"]

class ProxyManager:
    def __init__(self):
        self.current_region_index = 0
        
    def get_next_region(self):
        region = REGIONS[self.current_region_index]
        self.current_region_index = (self.current_region_index + 1) % len(REGIONS)
        return region
    
    def get_server_status(self):
        # In production, implement actual ping check
        return {
            "status": "Online",
            "players": "1,234",
            "uptime": "99.8%"
        }
    
    def generate_activation_code(self):
        import random
        import string
        prefix = random.choice(['AB', 'CD', 'EF', 'GH'])
        numbers = ''.join(random.choice(string.digits) for _ in range(6))
        suffix = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(3))
        return f"{prefix}{numbers}{suffix}"

proxy_manager = ProxyManager()

@app.route('/')
def index():
    region = proxy_manager.get_next_region()
    server_status = proxy_manager.get_server_status()
    
    # Get videos from Firebase
    videos = []
    try:
        if db:
            videos_ref = db.collection('videos').order_by('order', direction=firestore.Query.ASCENDING).limit(6)
            videos = [doc.to_dict() for doc in videos_ref.stream()]
    except:
        # Default videos if Firebase fails
        videos = [
            {"title": "How to Setup Proxy", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg"},
            {"title": "Free Fire Tips", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg"},
            {"title": "Best Settings", "url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg"}
        ]
    
    return render_template('index.html', 
                         region=region,
                         server_status=server_status,
                         videos=videos)

@app.route('/download')
def download():
    if 'activation_code' not in session:
        session['activation_code'] = proxy_manager.generate_activation_code()
    
    # Get download link from Firebase
    download_link = "#"
    try:
        if db:
            config_ref = db.collection('config').document('download')
            config = config_ref.get()
            if config.exists:
                download_link = config.to_dict().get('apk_link', '#')
    except:
        pass
    
    # Get proxy config
    proxy_config = {"ip": "192.168.1.1", "port": "8080"}
    try:
        if db:
            config_ref = db.collection('config').document('proxy')
            config = config_ref.get()
            if config.exists:
                proxy_config = config.to_dict()
    except:
        pass
    
    # Generate QR code
    qr_content = f"http://{proxy_config.get('ip', '')}:{proxy_config.get('port', '')}"
    qr_code = pyqrcode.create(qr_content)
    
    # Save QR code to bytes
    qr_bytes = BytesIO()
    qr_code.png(qr_bytes, scale=6)
    qr_bytes.seek(0)
    
    return render_template('download.html',
                         activation_code=session['activation_code'],
                         download_link=download_link,
                         proxy_config=proxy_config,
                         qr_bytes=qr_bytes.getvalue())

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin_panel'))
    
    return render_template('admin_login.html')

@app.route('/admin')
def admin_panel():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    return render_template('admin.html')

@app.route('/admin/config', methods=['GET', 'POST'])
def admin_config():
    if not session.get('admin_logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == 'POST':
        data = request.json
        
        try:
            if db:
                # Update download link
                if 'download_link' in data:
                    db.collection('config').document('download').set({
                        'apk_link': data['download_link'],
                        'updated_at': firestore.SERVER_TIMESTAMP
                    })
                
                # Update proxy config
                if 'proxy_ip' in data and 'proxy_port' in data:
                    db.collection('config').document('proxy').set({
                        'ip': data['proxy_ip'],
                        'port': data['proxy_port'],
                        'updated_at': firestore.SERVER_TIMESTAMP
                    })
                
                return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "Method not allowed"}), 405

@app.route('/admin/videos', methods=['GET', 'POST', 'DELETE'])
def admin_videos():
    if not session.get('admin_logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == 'GET':
        try:
            if db:
                videos_ref = db.collection('videos').order_by('order')
                videos = [{"id": doc.id, **doc.to_dict()} for doc in videos_ref.stream()]
                return jsonify(videos)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'POST':
        data = request.json
        try:
            if db:
                video_ref = db.collection('videos').document()
                data['created_at'] = firestore.SERVER_TIMESTAMP
                video_ref.set(data)
                return jsonify({"success": True, "id": video_ref.id})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        video_id = request.args.get('id')
        try:
            if db and video_id:
                db.collection('videos').document(video_id).delete()
                return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "Method not allowed"}), 405

@app.route('/api/region')
def get_region():
    region = proxy_manager.get_next_region()
    return jsonify({"region": region})

@app.route('/api/status')
def get_status():
    status = proxy_manager.get_server_status()
    return jsonify(status)

@app.route('/qr-code')
def get_qr_code():
    proxy_config = {"ip": "192.168.1.1", "port": "8080"}
    try:
        if db:
            config_ref = db.collection('config').document('proxy')
            config = config_ref.get()
            if config.exists:
                proxy_config = config.to_dict()
    except:
        pass
    
    qr_content = f"http://{proxy_config.get('ip', '')}:{proxy_config.get('port', '')}"
    qr_code = pyqrcode.create(qr_content)
    
    qr_bytes = BytesIO()
    qr_code.png(qr_bytes, scale=6)
    qr_bytes.seek(0)
    
    return send_file(qr_bytes, mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True, port=5000)