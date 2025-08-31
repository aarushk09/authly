from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
import random
import uuid
from datetime import datetime
import cv2
import mediapipe as mp
import numpy as np
import base64
import io
from PIL import Image

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

# File to store user data (JSON-based local storage)
USERS_FILE = 'users.json'

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def find_user_by_username(username):
    """Find user by username"""
    users = load_users()
    for user in users:
        if user.get('username') == username:
            return user
    return None

def find_user_by_id(user_id):
    """Find user by ID"""
    users = load_users()
    for user in users:
        if user.get('id') == user_id:
            return user
    return None

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    # Check if user already exists
    if find_user_by_username(username):
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    users = load_users()
    
    # Check if email already exists
    for user in users:
        if user.get('email') == email:
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = generate_password_hash(password)
    
    new_user = {
        'id': user_id,
        'username': username,
        'email': email,
        'password': hashed_password,
        'join_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'login_count': 0,
        'challenges_completed': 0
    }
    
    users.append(new_user)
    save_users(users)
    
    # Store pending authentication in session (finger challenge required)
    session['pending_auth'] = {
        'user_id': user_id,
        'username': username,
        'action': 'register'
    }

    return jsonify({'success': True, 'message': 'Registration successful! Complete finger challenge to continue.'})

@app.route('/login', methods=['POST'])
def login():
    """Authenticate user with username and password"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400
    
    user = find_user_by_username(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    # Update login count
    users = load_users()
    for i, u in enumerate(users):
        if u['id'] == user['id']:
            users[i]['login_count'] = user.get('login_count', 0) + 1
            break
    save_users(users)
    
    # Store pending authentication (finger challenge required)
    session['pending_auth'] = {
        'user_id': user['id'],
        'username': user['username'],
        'action': 'login'
    }
    return jsonify({'success': True, 'message': 'Credentials verified! Complete finger challenge to continue.'})

@app.route('/challenge/fingers', methods=['POST'])
def finger_challenge():
    """Finger counting challenge using MediaPipe"""
    try:
        # Get target number from session (set by /challenge/generate)
        target_number = session.get('target_number', random.randint(1, 5))
        
        # Get image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'message': 'No image data provided'})
        
        # Decode base64 image
        image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64, prefix
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Initialize MediaPipe hands
        mp_hands = mp.solutions.hands
        hands = mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2RGB)
        
        # Process the image
        results = hands.process(rgb_image)
        
        if results.multi_hand_landmarks:
            # Count fingers
            finger_count = count_fingers(results.multi_hand_landmarks[0])
            
            # Check if finger count matches target
            success = finger_count == target_number
            
            return jsonify({
                'success': success,
                'target_number': target_number,
                'detected_fingers': finger_count,
                'message': f'Detected {finger_count} fingers. Target was {target_number}.'
            })
        else:
            return jsonify({
                'success': False,
                'target_number': target_number,
                'detected_fingers': 0,
                'message': 'No hand detected in image.'
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error processing image: {str(e)}'})

def count_fingers(hand_landmarks):
    """Count the number of extended fingers"""
    # Landmark IDs for fingertips and finger joints
    tip_ids = [4, 8, 12, 16, 20]  # Thumb, Index, Middle, Ring, Pinky tips
    pip_ids = [3, 6, 10, 14, 18]  # PIP joints (except thumb uses IP joint)
    
    fingers = []
    
    # Thumb (special case - check x coordinate)
    if hand_landmarks.landmark[tip_ids[0]].x > hand_landmarks.landmark[pip_ids[0]].x:
        fingers.append(1)
    else:
        fingers.append(0)
    
    # Other four fingers (check y coordinate)
    for i in range(1, 5):
        if hand_landmarks.landmark[tip_ids[i]].y < hand_landmarks.landmark[pip_ids[i]].y:
            fingers.append(1)
        else:
            fingers.append(0)
    
    return sum(fingers)

@app.route('/challenge/generate')
def generate_challenge():
    """Generate a new finger challenge number"""
    target_number = random.randint(1, 5)
    session['target_number'] = target_number
    return jsonify({'target_number': target_number})

@app.route('/dashboard')
def dashboard():
    """Protected dashboard - only accessible after successful authentication"""
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    user_data = find_user_by_id(session['user_id'])
    if not user_data:
        session.clear()
        return redirect(url_for('index'))
        
    return render_template('dashboard.html', user=user_data)

@app.route('/complete-challenge', methods=['POST'])
def complete_challenge():
    """Mark challenge as completed and create session"""
    # Validate that challenge was passed (client indicates) then promote pending_auth
    data = request.get_json()
    if not data.get('challenge_passed'):
        return jsonify({'success': False, 'message': 'Challenge not passed'})

    pending = session.get('pending_auth')
    if not pending:
        return jsonify({'success': False, 'message': 'No pending authentication found'})

    user = find_user_by_id(pending['user_id'])
    if not user:
        session.pop('pending_auth', None)
        return jsonify({'success': False, 'message': 'User not found'})

    # Update stats
    users = load_users()
    for i, u in enumerate(users):
        if u['id'] == user['id']:
            users[i]['challenges_completed'] = u.get('challenges_completed', 0) + 1
            users[i]['login_count'] = u.get('login_count', 0) + (1 if pending['action']=='login' else 0)
            break
    save_users(users)

    # Promote to authenticated session
    session['user_id'] = user['id']
    session['username'] = user['username']
    session.pop('pending_auth', None)

    return jsonify({'success': True, 'username': user['username']})

@app.route('/logout')
def logout():
    """Logout and clear session"""
    session.clear()
    return redirect(url_for('index'))

@app.route('/cancel-auth')
def cancel_auth():
    """Cancel pending auth (user navigates back)"""
    session.pop('pending_auth', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
