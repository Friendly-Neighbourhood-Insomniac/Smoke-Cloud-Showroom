import { isMobileDevice } from './utils.js';

const promptElement = document.getElementById('interaction-prompt');
const infoPanelElement = document.getElementById('info-panel');
const infoPanelTitleElement = document.getElementById('info-panel-title');
const infoPanelContentElement = document.getElementById('info-panel-content');
const infoPanelCloseButton = document.getElementById('info-panel-close');
const welcomeScreenElement = document.getElementById('welcome-screen');
const startExperienceButton = document.getElementById('start-experience-button');
const muteButton = document.getElementById('mute-button');
const loadingProgressElement = document.getElementById('loading-progress');
const controlInstructionsTextElement = document.getElementById('control-instructions-text');
const touchControlsElement = document.getElementById('touch-controls');
const audioControls = document.getElementById('audio-controls');

let closeInfoPanelCallback = null;
let startExperienceCallback = null;
let toggleMuteCallback = null;
let isMuted = false;
let playMusicCallback = null;

export function initInfoPanel(callback) {
    closeInfoPanelCallback = callback;
    if (infoPanelCloseButton) {
        infoPanelCloseButton.addEventListener('click', () => {
            if (closeInfoPanelCallback) closeInfoPanelCallback();
        });
    }
}

function updateWelcomeInstructionsText() {
    if (controlInstructionsTextElement) {
        const isMobile = isMobileDevice();
        if (isMobile) {
            controlInstructionsTextElement.textContent = "Use the left joystick to move, right side to look around, and tap the 'E' button to interact.";
        } else {
            controlInstructionsTextElement.textContent = "Use W/A/S/D to move, Mouse to look, and E to interact.";
        }
    }
}

export function initWelcomeScreen(callback) {
    startExperienceCallback = callback;
    updateWelcomeInstructionsText();
    if (startExperienceButton) {
        startExperienceButton.addEventListener('click', () => {
            hideWelcomeScreen();
            if (startExperienceCallback) startExperienceCallback();
        });
    }
}

export function initAudioControls(callback) {
    toggleMuteCallback = callback;
    if (muteButton) {
        if (isMobileDevice()) {
            muteButton.style.display = 'none';
            muteButton.textContent = 'Play Music to Enhance Vibes';
            muteButton.classList.add('play-music');
        }

        muteButton.addEventListener('click', () => {
            if (isMobileDevice() && muteButton.classList.contains('play-music')) {
                muteButton.classList.remove('play-music');
                muteButton.textContent = 'Mute';
                isMuted = false;
            } else {
            isMuted = !isMuted;
            }
            setMuteButtonState(isMuted);
            if (toggleMuteCallback) {
                toggleMuteCallback(isMuted);
            }
            if (isMobileDevice()) {
                muteButton.style.display = 'block';
            }
        });
    }
}

export function setMuteButtonState(muted) {
    isMuted = muted;
    if (muteButton) {
        muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
        if (isMuted) {
            muteButton.classList.add('muted');
        } else {
            muteButton.classList.remove('muted');
        }
    }
}

export function updateLoadingProgress(percentage) {
    if (loadingProgressElement) {
        loadingProgressElement.textContent = `Loading ${percentage.toFixed(0)}%...`;
        loadingProgressElement.style.opacity = '1';
    }
}

export function hideLoadingProgress() {
    if (loadingProgressElement) {
        loadingProgressElement.style.opacity = '0';
    }
}

export function enableStartButton() {
    if (startExperienceButton) {
        startExperienceButton.disabled = false;
    }
}

export function disableStartButton() {
    if (startExperienceButton) {
        startExperienceButton.disabled = true;
    }
}

export function showWelcomeScreen() {
    if (welcomeScreenElement) {
        const welcomeImage = welcomeScreenElement.querySelector('img');
        if (welcomeImage && isMobileDevice()) {
            welcomeImage.src = '/assets/mobile-UI.png';
        }
        welcomeScreenElement.style.opacity = '1';
        welcomeScreenElement.style.display = 'flex';
        disableStartButton();
        updateLoadingProgress(0);
    }
}

export function hideWelcomeScreen() {
    if (welcomeScreenElement) {
        welcomeScreenElement.style.opacity = '0';
        setTimeout(() => {
            welcomeScreenElement.style.display = 'none';
        }, 500);
    }
}

export function showInfoPanel(title, content, imageUrl) {
    if (infoPanelElement && infoPanelTitleElement && infoPanelContentElement) {
        infoPanelContentElement.innerHTML = '';
        if (imageUrl) {
            infoPanelTitleElement.style.display = 'none';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = title || "Product Information Card";
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '5px';
            infoPanelContentElement.appendChild(img);
        } else {
            infoPanelTitleElement.style.display = 'block';
            infoPanelTitleElement.textContent = title;
            infoPanelContentElement.innerHTML = content;
        }
        infoPanelElement.style.display = 'flex';
    }
}

export function hideInfoPanel() {
    if (infoPanelElement) {
        infoPanelElement.style.display = 'none';
    }
}

export function showInteractionPrompt() {
    if (promptElement) {
        promptElement.style.display = 'block';
    }
}

export function hideInteractionPrompt() {
    if (promptElement) {
        promptElement.style.display = 'none';
    }
}

export function updateInteractionPromptText(text) {
    if (promptElement) {
        const isMobile = isMobileDevice();
        const displayText = isMobile ? text.replace('Press E', 'Tap E') : text;
        promptElement.textContent = displayText;
    }
}

export function showTouchControls() {
    if (touchControlsElement) {
        touchControlsElement.style.display = 'block';
    }
}

export function hideTouchControls() {
    if (touchControlsElement) {
        touchControlsElement.style.display = 'none';
    }
}