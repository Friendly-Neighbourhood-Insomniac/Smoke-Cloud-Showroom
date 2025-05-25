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

let closeInfoPanelCallback = null;
let startExperienceCallback = null;
let toggleMuteCallback = null;
let isMuted = false;

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
        controlInstructionsTextElement.textContent = isMobile
            ? "Use the left side joystick to move, right side to look around, and tap the 'E' button to interact."
            : "Use W/A/S/D to move, Mouse to look, and E to interact.";
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
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            setMuteButtonState(isMuted);
            if (toggleMuteCallback) {
                toggleMuteCallback(isMuted);
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
        const interactText = isMobile ? "Tap 'E'" : "Press E";
        const updatedText = text.replace("Press E", interactText);
        promptElement.textContent = updatedText;
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