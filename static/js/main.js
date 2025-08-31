// Finger authentication system with MediaPipe integration

// Global state
let pendingUser = null;
let currentScreen = 'auth'; // 'auth', 'challenge', 'success'

function showScreen(screenName) {
    console.log('Switching to screen:', screenName);
    
    // Hide all screens
    const authScreen = document.getElementById('auth-screen');
    const challengeScreen = document.getElementById('challenge-screen');
    const successScreen = document.getElementById('success-screen');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (challengeScreen) challengeScreen.classList.add('hidden');
    if (successScreen) successScreen.classList.add('hidden');
    
    // Show selected screen
    if (screenName === 'auth' && authScreen) {
        authScreen.classList.remove('hidden');
    } else if (screenName === 'challenge' && challengeScreen) {
        challengeScreen.classList.remove('hidden');
    } else if (screenName === 'success' && successScreen) {
        successScreen.classList.remove('hidden');
    }
    
    currentScreen = screenName;
    hideMessage();
}

function toggleAuthForm(formType) {
    console.log('Toggling to:', formType);
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    
    if (!loginForm || !signupForm || !loginToggle || !signupToggle) {
        console.error('Form elements not found');
        return;
    }
    
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        loginToggle.classList.add('active');
        signupToggle.classList.remove('active');
    } else if (formType === 'signup') {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        signupToggle.classList.add('active');
        loginToggle.classList.remove('active');
    }
    
    // Clear any messages
    hideMessage();
}

function showMessage(message, type = 'waiting') {
    const messageDiv = document.getElementById('status-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `status-message status-${type}`;
        messageDiv.style.display = 'block';
    }
}

function hideMessage() {
    const messageDiv = document.getElementById('status-message');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
}

function startCountdown(seconds, callback) {
    const countdownElement = document.getElementById('countdown');
    if (!countdownElement) return;
    
    let timeLeft = seconds;
    countdownElement.textContent = `${timeLeft}s remaining`;
    
    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft > 0 ? `${timeLeft}s remaining` : 'Time\'s up!';
        if (timeLeft <= 0) {
            clearInterval(timer);
            if (callback) callback();
        }
    }, 1000);
    
    return timer;
}

class CameraHandler {
    constructor() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvasElement');
        this.stream = null;
        this.context = null;
        
        // Initialize canvas context
        if (this.canvas) {
            this.context = this.canvas.getContext('2d');
        }
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            
            if (this.video) {
                this.video.srcObject = this.stream;
                
                // Wait for video to be ready
                return new Promise((resolve) => {
                    this.video.onloadedmetadata = () => {
                        // Set canvas dimensions to match video
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                        resolve(true);
                    };
                });
            }
        } catch (error) {
            console.error('Camera error:', error);
            showMessage('Camera access required for authentication', 'error');
            return false;
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
    
    captureFrame() {
        if (!this.video || !this.canvas || !this.context) {
            return null;
        }
        
        // Draw current video frame to canvas
        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Convert canvas to base64 image data
        return this.canvas.toDataURL('image/jpeg', 0.8);
    }
}

class AuthChallenge {
    constructor() {
        this.camera = new CameraHandler();
        this.targetNumber = 0;
        this.challengeTimer = null;
        this.detectionInterval = null;
        this.isDetecting = false;
        this.challengeTimeLimit = 15; // 15 seconds for challenge
    }
    
    async startChallenge() {
        try {
            // Generate target number from server
            const response = await fetch('/challenge/generate');
            const data = await response.json();
            this.targetNumber = data.target_number;
        
        // Update UI
        document.getElementById('target-display').textContent = this.targetNumber;
        document.getElementById('challenge-instruction').textContent = 
                `Hold up ${this.targetNumber} finger${this.targetNumber !== 1 ? 's' : ''} when the countdown starts`;
            
            showMessage('Initializing camera...', 'waiting');
        
            // Start camera and wait for it to be fully ready
        const cameraStarted = await this.camera.startCamera();
        if (!cameraStarted) return;
        
        document.getElementById('video-container').style.display = 'block';
            showMessage('Camera ready! Challenge will begin in 3 seconds...', 'waiting');
        
            // Wait 3 seconds before starting the actual challenge countdown
        setTimeout(() => {
            this.runDetection();
        }, 3000);
        } catch (error) {
            console.error('Error starting challenge:', error);
            showMessage('Failed to start challenge. Please try again.', 'error');
        }
    }
    
    runDetection() {
        showMessage(`Show ${this.targetNumber} finger${this.targetNumber !== 1 ? 's' : ''} now!`, 'waiting');
        this.isDetecting = true;
        
        // Start 15-second detection timer
        this.challengeTimer = startCountdown(this.challengeTimeLimit, () => {
            this.stopDetection();
            showMessage('Time\'s up! Please try again.', 'error');
            this.onFailure();
        });
        
        // Start finger detection - check every 500ms for more responsiveness
        this.detectionInterval = setInterval(() => {
            if (this.isDetecting) {
                this.detectFingers();
            }
        }, 500);
    }
    
    async detectFingers() {
        try {
            // Capture frame from video
            const imageData = this.camera.captureFrame();
            if (!imageData) return;
            
            // Send to server for finger detection
            const response = await fetch('/challenge/fingers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.stopDetection();
                showMessage(`Success! Detected ${result.detected_fingers} fingers.`, 'success');
                this.onSuccess();
            } else if (result.detected_fingers !== undefined) {
                // Show current detection but continue
                const message = `Detected ${result.detected_fingers} fingers. Keep trying!`;
                showMessage(message, 'waiting');
            }
        } catch (error) {
            console.error('Error detecting fingers:', error);
        }
    }
    
    stopDetection() {
        this.isDetecting = false;
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        if (this.challengeTimer) {
            clearInterval(this.challengeTimer);
            this.challengeTimer = null;
        }
    }
    
    async onSuccess() {
        this.camera.stopCamera();
        document.getElementById('video-container').style.display = 'none';
        
        showMessage('Success! Finger count verified. Completing authentication...', 'success');
        
        try {
            // Complete the authentication process
            const response = await fetch('/complete-challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    challenge_passed: true
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success screen with username
                document.getElementById('welcome-username').textContent = result.username || pendingUser?.username || 'User';
                showScreen('success');
        } else {
                showMessage(result.message || 'Authentication failed', 'error');
                this.onFailure();
            }
        } catch (error) {
            console.error('Error completing challenge:', error);
            showMessage('Failed to complete authentication. Please try again.', 'error');
            this.onFailure();
        }
    }
    
    onFailure() {
        this.camera.stopCamera();
        document.getElementById('video-container').style.display = 'none';
        
        showMessage('Authentication failed. Please try again.', 'error');
        
        // Show retry button
        document.getElementById('retry-challenge').classList.remove('hidden');
    }
    
    reset() {
        this.stopDetection();
        this.camera.stopCamera();
        document.getElementById('video-container').style.display = 'none';
        document.getElementById('retry-challenge').classList.add('hidden');
        
        document.getElementById('target-display').textContent = '-';
        document.getElementById('challenge-instruction').textContent = 'Please complete the finger challenge to verify you\'re not a bot';
        document.getElementById('countdown').textContent = '';
        
        hideMessage();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const authChallenge = new AuthChallenge();
    
    // Form toggle functionality
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    
    if (loginToggle) {
        loginToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Login toggle clicked');
            toggleAuthForm('login');
        });
    }
    
    if (signupToggle) {
        signupToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Signup toggle clicked');
            toggleAuthForm('signup');
        });
    }
    
    // Start button
    const startBtn = document.getElementById('start-challenge');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log('Start challenge clicked');
        authChallenge.startChallenge();
    });
    }
    
    // Retry button
    const retryBtn = document.getElementById('retry-challenge');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            console.log('Retry challenge clicked');
        authChallenge.reset();
    });
    }
    
    // Back to auth button
    const backBtn = document.getElementById('back-to-auth');
    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            console.log('Back to auth clicked');
            authChallenge.reset();
            
            // Cancel pending authentication
            try {
                await fetch('/cancel-auth');
            } catch (error) {
                console.log('Error canceling auth:', error);
            }
            
            showScreen('auth');
            pendingUser = null;
        });
    }
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            console.log('Login attempt for username:', username);
            
            if (!username || !password) {
                showMessage('Please enter both username and password', 'error');
                return;
            }
            
            showMessage('Logging in...', 'waiting');
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                const result = await response.json();
                console.log('Login response:', result);
                
                if (result.success) {
                    // Store pending user info and proceed to finger challenge
                    pendingUser = { username: username };
                    showMessage('Login successful! Now complete the finger challenge to continue.', 'success');
                    setTimeout(() => {
                        showScreen('challenge');
                    }, 1500);
                } else {
                    showMessage(result.message || 'Login failed', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Login failed. Please try again.', 'error');
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
            console.log('Signup form submitted');
            
            const username = document.getElementById('signup-username').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            
            console.log('Signup attempt for username:', username);
            
            if (!username || !email || !password) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            showMessage('Creating account...', 'waiting');
            
            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    })
                });
                
                const result = await response.json();
                console.log('Signup response:', result);
                
                if (result.success) {
                    // Store pending user info and proceed to finger challenge
                    pendingUser = { username: username, email: email };
                    showMessage('Registration successful! Now complete the finger challenge to continue.', 'success');
                    setTimeout(() => {
                        showScreen('challenge');
                    }, 1500);
                } else {
                    showMessage(result.message || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('Registration failed. Please try again.', 'error');
            }
        });
    }
    
    // Continue to dashboard button
    const continueBtn = document.getElementById('continue-to-dashboard');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }
    
    // Initialize to login form by default
    toggleAuthForm('login');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Stop camera if active
    const video = document.getElementById('videoElement');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
});