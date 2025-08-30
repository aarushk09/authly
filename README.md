# Finger Authentication System

A simple authentication system that uses computer vision to detect finger gestures for user verification.

## Features

- **Finger Counting Challenge**: Users must hold up the correct number of fingers to authenticate
- **Local User Storage**: JSON-based user management (no external auth services)
- **Real-time Computer Vision**: Uses MediaPipe for finger detection
- **Clean, Minimal Design**: Simple interface focused on functionality

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.8 or higher
- Webcam/camera access
- Modern web browser

### Installation

1. **Clone/Download the project**
   ```bash
   cd wild-auth-system
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎯 How It Works

### Challenge 1: Finger Detection
1. User clicks "Start Challenge"
2. System generates a random number (1-5)
3. User must hold up that many fingers in front of their camera
4. Computer vision detects and verifies finger count
5. Success leads to next challenge

### User Registration
- After successful finger detection
- Users create account with username and email
- Local JSON storage for user data

### Dashboard Access
- Protected area accessible only after authentication
- Displays user stats and challenge history
- Features placeholder for future functionality

## Project Structure

```
finger-auth-system/
│
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── users.json            # User data storage (created automatically)
│
├── templates/
│   ├── index.html        # Main authentication page
│   └── dashboard.html    # Protected dashboard
│
└── static/
    ├── css/
    │   └── style.css     # Clean, minimal stylesheet
    └── js/
        └── main.js       # Authentication logic
```

## 🔧 Technical Details

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Computer Vision**: OpenCV + MediaPipe
- **Storage**: JSON files (local)
- **Authentication**: Session-based

## Design Philosophy

This project demonstrates a practical approach to alternative authentication methods by combining:
- Computer vision technology
- Simple, clean user interface
- Secure session management
- Minimal, functional design

The focus is on creating a working proof-of-concept with clean, maintainable code.

## 🚧 Current Status

**✅ Completed:**
- Basic Flask application structure
- HTML templates and CSS styling
- JavaScript framework for challenges
- Project initialization and setup

**🔄 In Progress:**
- Computer vision finger detection implementation

**📋 Coming Next:**
- Additional authentication challenges
- Enhanced user features
- Performance optimizations

## 🤝 Contributing

This is a fun experimental project! Feel free to suggest new challenge ideas or improvements.

---

*Made with ❤️ and a lot of creativity!*
