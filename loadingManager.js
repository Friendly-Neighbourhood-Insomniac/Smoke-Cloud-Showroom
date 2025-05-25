import * as THREE from 'three';
import { updateLoadingProgress, enableStartButton, hideLoadingProgress } from './ui.js';

const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log(`Started loading: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} items.`);
    updateLoadingProgress(0); // Initialize progress
};

loadingManager.onLoad = () => {
    console.log('All assets loaded!');
    hideLoadingProgress();
    enableStartButton();
};

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    console.log(`Loading file: ${url}. Loaded ${itemsLoaded} of ${itemsTotal} items. Progress: ${progress.toFixed(2)}%`);
    updateLoadingProgress(progress);
};

loadingManager.onError = (url) => {
    console.error(`There was an error loading ${url}. Attempting to proceed...`);
    // Attempt to allow the experience to start even if an asset failed.
    // The error in the console will indicate what failed.
    hideLoadingProgress(); // Hide loading indicator
    enableStartButton();   // Enable the start button
};

export default loadingManager;