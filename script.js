document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Navigation
    const backBtn = document.getElementById('back-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const statsBtn = document.getElementById('stats-btn');
    const viewTimer = document.getElementById('view-timer');
    const viewSettings = document.getElementById('view-settings');
    const viewStats = document.getElementById('view-stats');
    const sessionTypeLabel = document.getElementById('session-type');

    // DOM Elements - Timer
    const minDisplay = document.getElementById('display-min');
    const secDisplay = document.getElementById('display-sec');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressCircle = document.getElementById('progress-circle');
    const presetBtns = document.querySelectorAll('.btn-preset');
    
    // DOM Elements - Settings/Stats
    const saveTimeBtn = document.getElementById('save-time');
    const customMinInput = document.getElementById('custom-min');
    const statsCountDisplay = document.getElementById('stats-count');
    const statsTimeDisplay = document.getElementById('stats-time');
    const clearStatsBtn = document.getElementById('clear-stats');

    // Timer State
    let totalSeconds = 25 * 60;
    let remainingSeconds = totalSeconds;
    let timerId = null;
    let isRunning = false;
    let currentMode = 'focus'; 

    // Stats State (LocalStorage)
    let stats = JSON.parse(localStorage.getItem('temporal_stats')) || {
        sessions: 0,
        minutes: 0
    };

    // Audio Context (Web Audio API)
    let audioCtx = null;

    function playNotificationSound() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    }

    // Progress Ring Setup
    const radius = 142;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    function setProgress(percent) {
        const offset = circumference - (percent / 100 * circumference);
        progressCircle.style.strokeDashoffset = offset;
    }

    // View Management
    function switchView(viewName) {
        [viewTimer, viewSettings, viewStats].forEach(v => v.classList.remove('active'));
        
        if (viewName === 'settings') {
            viewSettings.classList.add('active');
            backBtn.classList.remove('hidden');
        } else if (viewName === 'stats') {
            updateStatsUI();
            viewStats.classList.add('active');
            backBtn.classList.remove('hidden');
        } else {
            viewTimer.classList.add('active');
            backBtn.classList.add('hidden');
        }
    }

    function updateStatsUI() {
        statsCountDisplay.textContent = stats.sessions;
        statsTimeDisplay.textContent = stats.minutes;
    }

    function updateDisplay() {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        
        minDisplay.textContent = mins.toString().padStart(2, '0');
        secDisplay.textContent = secs.toString().padStart(2, '0');
        
        const percent = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
        setProgress(percent);

        document.title = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} | Temporal Focus`;
    }

    function toggleTimer() {
        if (isRunning) pauseTimer();
        else startTimer();
    }

    function startTimer() {
        if (remainingSeconds <= 0) return;
        isRunning = true;
        startBtn.textContent = 'PAUSE';
        startBtn.classList.add('running');
        
        timerId = setInterval(() => {
            remainingSeconds--;
            updateDisplay();
            if (remainingSeconds <= 0) completeSession();
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timerId);
        isRunning = false;
        startBtn.textContent = 'RESUME';
        startBtn.classList.remove('running');
    }

    function resetTimer() {
        clearInterval(timerId);
        remainingSeconds = totalSeconds;
        isRunning = false;
        startBtn.textContent = 'START';
        startBtn.classList.remove('running');
        updateDisplay();
        setProgress(0);
    }

    function completeSession() {
        clearInterval(timerId);
        isRunning = false;
        startBtn.textContent = 'START';
        startBtn.classList.remove('running');
        
        playNotificationSound();

        // Update Stats
        if (currentMode === 'focus') {
            stats.sessions += 1;
            stats.minutes += Math.floor(totalSeconds / 60);
            localStorage.setItem('temporal_stats', JSON.stringify(stats));
        }

        setTimeout(() => {
            alert(currentMode === 'focus' ? 'Focus session complete! Time for a break.' : 'Break over! Ready to focus?');
            resetTimer();
        }, 100);
    }

    function setMode(mode, minutes) {
        currentMode = mode;
        totalSeconds = minutes * 60;
        remainingSeconds = totalSeconds;
        
        if (mode === 'break') {
            document.body.classList.remove('theme-focus');
            document.body.classList.add('theme-break');
            sessionTypeLabel.textContent = 'Break Session';
        } else {
            document.body.classList.remove('theme-break');
            document.body.classList.add('theme-focus');
            sessionTypeLabel.textContent = 'Focus Session';
        }
        
        resetTimer();
    }

    // Event Listeners
    startBtn.addEventListener('click', toggleTimer);
    resetBtn.addEventListener('click', resetTimer);
    settingsBtn.addEventListener('click', () => switchView('settings'));
    statsBtn.addEventListener('click', () => switchView('stats'));
    backBtn.addEventListener('click', () => switchView('timer'));

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mins = parseInt(btn.dataset.time);
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.textContent.toLowerCase().includes('break')) setMode('break', mins);
            else setMode('focus', mins);
        });
    });

    saveTimeBtn.addEventListener('click', () => {
        const mins = parseInt(customMinInput.value);
        if (mins > 0 && mins < 1000) {
            setMode('focus', mins);
            switchView('timer');
            presetBtns.forEach(b => b.classList.remove('active'));
        } else {
            alert('Please enter a duration between 1 and 999 minutes.');
        }
    });

    clearStatsBtn.addEventListener('click', () => {
        if (confirm('Reset all progress statistics?')) {
            stats = { sessions: 0, minutes: 0 };
            localStorage.setItem('temporal_stats', JSON.stringify(stats));
            updateStatsUI();
        }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            toggleTimer();
        }
        if (e.key.toLowerCase() === 'r' && document.activeElement.tagName !== 'INPUT') {
            resetTimer();
        }
    });

    // Initial Setup
    updateDisplay();
    setProgress(0);
});
