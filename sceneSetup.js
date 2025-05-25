import * as THREE from 'three';

export function setupSceneLighting(scene) {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased from 0.7
    scene.add(ambientLight);
}