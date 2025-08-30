// Simple finger authentication system

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
    
    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft > 0 ? `${timeLeft}s remaining` : '';
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
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480, facingMode: 'user' } 
            });
            
            if (this.video) {
                this.video.srcObject = this.stream;
                return true;
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
}

class AuthChallenge {
    constructor() {
        this.camera = new CameraHandler();
        this.targetNumber = 0;
        this.challengeTimer = null;
    }
    
    async startChallenge() {
        // Generate target number
        this.targetNumber = Math.floor(Math.random() * 5) + 1;
        
        // Update UI
        document.getElementById('target-display').textContent = this.targetNumber;
        document.getElementById('challenge-instruction').textContent = 
            `Hold up ${this.targetNumber} finger${this.targetNumber !== 1 ? 's' : ''}`;
        
        // Start camera
        const cameraStarted = await this.camera.startCamera();
        if (!cameraStarted) return;
        
        document.getElementById('video-container').style.display = 'block';
        showMessage('Camera started. Get ready...', 'waiting');
        
        // Countdown before detection starts
        setTimeout(() => {
            this.runDetection();
        }, 3000);
    }
    
    runDetection() {
        showMessage('Show your fingers now!', 'waiting');
        
        // Start detection timer
        this.challengeTimer = startCountdown(5, () => {
            this.simulateDetection();
        });
    }
    
    simulateDetection() {
        // Placeholder for actual finger detection
        // For now, randomly succeed 70% of the time
        const success = Math.random() > 0.3;
        
        this.camera.stopCamera();
        document.getElementById('video-container').style.display = 'none';
        
        if (success) {
            this.onSuccess();
        } else {
            this.onFailure();
        }
    }
    
    onSuccess() {
        showMessage('Success! Finger count verified.', 'success');
        
        // Hide retry button, show form
        document.getElementById('retry-challenge').classList.add('hidden');
        document.getElementById('user-form').classList.remove('hidden');
    }
    
    onFailure() {
        showMessage('Authentication failed. Please try again.', 'error');
        
        // Show retry button
        document.getElementById('retry-challenge').classList.remove('hidden');
    }
    
    reset() {
        this.camera.stopCamera();
        document.getElementById('video-container').style.display = 'none';
        document.getElementById('user-form').classList.add('hidden');
        document.getElementById('retry-challenge').classList.add('hidden');
        
        document.getElementById('target-display').textContent = '-';
        document.getElementById('challenge-instruction').textContent = 'Click "Start" to begin the finger detection challenge';
        document.getElementById('countdown').textContent = '';
        
        hideMessage();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const authChallenge = new AuthChallenge();
    
    // Start button
    document.getElementById('start-challenge').addEventListener('click', () => {
        authChallenge.startChallenge();
    });
    
    // Retry button
    document.getElementById('retry-challenge').addEventListener('click', () => {
        authChallenge.reset();
    });
    
    // Registration form
    document.getElementById('registration-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (username && email) {
            window.location.href = '/dashboard';
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Stop camera if active
    const video = document.getElementById('videoElement');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
});
