from flask import Flask, render_template, request, session, redirect, url_for, jsonify
import json
import os
import random
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

# File to store user data (JSON-based local storage)
USERS_FILE = 'users.json'

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/login')
def login():
    """Redirect to main page for authentication"""
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    """Protected dashboard - only accessible after successful authentication"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    users = load_users()
    user_data = users.get(session['user_id'], {})
    return render_template('dashboard.html', user=user_data)

@app.route('/logout')
def logout():
    """Logout and clear session"""
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
