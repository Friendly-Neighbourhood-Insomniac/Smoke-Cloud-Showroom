const promptElement = document.getElementById('interaction-prompt');
const infoPanelElement = document.getElementById('info-panel');
const infoPanelTitleElement = document.getElementById('info-panel-title');
const infoPanelContentElement = document.getElementById('info-panel-content');
const infoPanelCloseButton = document.getElementById('info-panel-close');
const welcomeScreenElement = document.getElementById('welcome-screen');
const startExperienceButton = document.getElementById('start-experience-button');
const muteButton = document.getElementById('mute-button');
const loadingProgressElement = document.getElementById('loading-progress');
const controlInstructionsTextElement = document.getElementById('control-instructions-text'); // New element
let closeInfoPanelCallback = null;
let startExperienceCallback = null;
let toggleMuteCallback = null;
let isMuted = false;
// isTouchDevice function and mobile.js dependency notes are removed
export function initInfoPanel(callback) {
    closeInfoPanelCallback = callback;
    if (infoPanelCloseButton) {
        infoPanelCloseButton.addEventListener('click', () => {
            if (closeInfoPanelCallback) closeInfoPanelCallback();
        });
    }
}
function updateWelcomeInstructionsText() { // Removed isMobile parameter
    if (controlInstructionsTextElement) {
        // Default to desktop controls as mobile support is removed
        controlInstructionsTextElement.textContent = "Controls: Use W/A/S/D to move, Mouse to look, and E to interact.";
    }
}
export function initWelcomeScreen(callback) { // Removed isMobile parameter
    startExperienceCallback = callback;
    updateWelcomeInstructionsText(); // Set initial instructions
    if (startExperienceButton) {
        startExperienceButton.addEventListener('click', () => {
            hideWelcomeScreen(); // This already hides the whole welcome screen including progress
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
            // Removed console.log from here
        });
    }
}
export function setMuteButtonState(muted) {
    isMuted = muted; // Ensure internal state is synced
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
        // Optionally set display to none after transition
        // setTimeout(() => { loadingProgressElement.style.display = 'none'; }, 300);
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
        disableStartButton(); // Ensure button is disabled when welcome screen is shown
        updateLoadingProgress(0); // Show initial loading progress
    }
}
export function hideWelcomeScreen() {
    if (welcomeScreenElement) {
        welcomeScreenElement.style.opacity = '0';
        // Wait for opacity transition to finish before setting display to none
        setTimeout(() => {
            welcomeScreenElement.style.display = 'none';
        }, 500); // Corresponds to transition duration in CSS
    }
}
export function showInfoPanel(title, content, imageUrl) { // Added imageUrl parameter
    if (infoPanelElement && infoPanelTitleElement && infoPanelContentElement) {
        // Clear previous content, especially if it was an image
        infoPanelContentElement.innerHTML = '';
        if (imageUrl) {
            // Hide title and default text content paragraph if an image is provided
            infoPanelTitleElement.style.display = 'none';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = title || "Product Information Card"; // Alt text for accessibility
            img.style.width = '100%'; // Make image responsive within the panel
            img.style.height = 'auto';
            img.style.borderRadius = '5px'; // Optional: if cards don't have rounded corners
            infoPanelContentElement.appendChild(img);
        } else {
            // Fallback to text if no image URL is provided
            infoPanelTitleElement.style.display = 'block';
            infoPanelTitleElement.textContent = title;
            infoPanelContentElement.innerHTML = content; // Use innerHTML if content might have HTML tags
        }
        infoPanelElement.style.display = 'flex'; // Changed to flex for centering content
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
        promptElement.textContent = text;
    }
}