import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { PlayerController, FirstPersonCameraController } from './rosieControls.js';
import { setupSceneLighting } from './sceneSetup.js';
import { Showroom } from './showroom.js';
import { createInteractiveObject } from './interactiveObject.js';
import { VolumetricFog } from './VolumetricFog.js';
import loadingManager from './loadingManager.js'; // Import the shared loading manager
import { showInteractionPrompt, hideInteractionPrompt, updateInteractionPromptText, initInfoPanel, showInfoPanel, hideInfoPanel, initWelcomeScreen, showWelcomeScreen, initAudioControls, setMuteButtonState, disableStartButton, updateLoadingProgress } from './ui.js'; 
// Removed isMobileDevice, setupMobileControls imports
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;
export class Game {
    constructor() {
        this.infoPanelActive = false; // Track info panel state
        this.isMobile = false; // Default to not mobile as mobile.js is removed
        // this.mobileUpdateCallbacks = []; // Removed as mobile specific updates are removed
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color output for sRGB textures
        document.body.appendChild(this.renderer.domElement);
        this.clock = new THREE.Clock();
        this.keys = {};
        this.interactiveObjects = [];
        this.speakerMixers = []; // To store animation mixers for speakers
        this.speakerAnimationActions = []; // To store speaker animation actions directly
        this.showroomRadius = 10; // Define showroom radius here or get from showroom object
        // Initialize loaders with the shared manager
        this.gltfLoader = new GLTFLoader(loadingManager);
        this.textureLoader = new THREE.TextureLoader(loadingManager);
        this.fontLoader = new FontLoader(loadingManager);
        this.audioLoader = new THREE.AudioLoader(loadingManager);
        this.setupEnvironment();
        this.setupPlayerAndControls();
        this.setupInteractiveObjects();
        this.preloadUICards(); 
        this.setupVolumetricFog(); 
        this.setupStreetLamps();
        this.setupSpeakers(); // Add speaker setup
        this.setupBackgroundMusic(); // Add background music setup
        this.setupBackgroundMusic(); // Add background music setup
        initInfoPanel(this.closeInfoPanel.bind(this));
        // initWelcomeScreen no longer needs isMobile parameter
        initWelcomeScreen(this.startExperience.bind(this)); 
        initAudioControls(this.toggleMute.bind(this));
        // Removed mobile controls setup block
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Escape' && this.infoPanelActive) {
                this.closeInfoPanel();
            }
        });
        document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }
    startExperience() {
        // This method is called when the "Start Experience" button is clicked
        console.log("Experience started!");
        this.firstPersonController.requestPointerLock(); // Request pointer lock to enable mouse look
        // Start background music if it's loaded and not already playing
        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
            // If music is now playing and not muted, ensure animations are playing
            if (this.backgroundMusic.getVolume() > 0) {
                this.speakerAnimationActions.forEach(action => {
                    action.paused = false;
                });
            }
        }
        // Any other actions to take when the experience truly begins, e.g., enabling animations
        if (!this.animationFrameId) { // Ensure animate loop isn't started multiple times
            this.animate();
        }
    }
    setupEnvironment() {
        setupSceneLighting(this.scene);
        this.showroom = new Showroom(this.scene, this.showroomRadius, 4, 64, this.textureLoader); // Pass textureLoader
        this.scene.background = new THREE.Color(0x1a1a2a); // Dark blueish background
    }
    setupPlayerAndControls() {
        // Player object (visual representation will be hidden in FPV)
        // Origin at the base of the player model
        const playerGeometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 4, 8);
        playerGeometry.translate(0, PLAYER_HEIGHT / 2, 0); // Move origin to base
        const playerMaterial = new THREE.MeshStandardMaterial({ visible: false }); // Hidden for FPV
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        // Start player further back, groundLevel is handled by PlayerController
        this.player.position.set(0, 0, -3); 
        this.player.rotation.y = Math.PI; // Player faces +Z axis (towards products)
        this.scene.add(this.player);

        this.playerController = new PlayerController(this.player, {
            moveSpeed: 5,
            jumpForce: 8,
            gravity: 25,
            groundLevel: 0 // Floor is at Y=0, player origin at feet
        });

        this.firstPersonController = new FirstPersonCameraController(this.camera, this.player, this.renderer.domElement, {
            eyeHeight: PLAYER_HEIGHT * 0.85, // Approx 1.53m
            mouseSensitivity: 0.002
        });
        
        // Default to first-person mode
        this.firstPersonController.enable();
        this.playerController.setCameraMode('first-person');
         // Initial Y rotation from FPC needs to be manually set if player starts rotated
        this.firstPersonController.rotationY = this.player.rotation.y;
        // Initial X rotation (pitch) for a slight downward look to match screenshot
        this.firstPersonController.rotationX = 0.1; 
    }

    setupInteractiveObjects() {
        const objectInfos = [
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Neon Rush.glb?T67Z', // Corrected asset URL
                    // textureUrl: undefined, // Ensuring no external texture is applied
                    color: 0xffffff, 
                    scale: 0.8,      // Assuming similar scale to other Smoke Cloud products
                    yOffset: 0.8       // Assuming similar yOffset
                },
                message: "Smoke Cloud - Neon Rush",
                details: { 
                    title: "Smoke Cloud: Neon Rush", 
                    content: "An electrifying surge of vibrant, glowing flavors. Get ready for the rush!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Neon Rush UI Card.png?cexk"
                },
                particleAreaScaleFactor: 0.6 // Consistent with other smoke cloud products
            },
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Frost Berry Fizz.glb?vic7', // New asset
                    // textureUrl: undefined, // Ensuring no external texture is applied
                    color: 0xffffff, 
                    scale: 0.8,      // Assuming similar scale to other Smoke Cloud product
                    yOffset: 0.8       // Assuming similar yOffset
                },
                message: "Smoke Cloud - Frost Berry Fizz",
                details: { 
                    title: "Smoke Cloud: Frost Berry Fizz", 
                    content: "A chilling blast of mixed berries with an icy, fizzy finish. Refreshingly cool.",
                    uiCardUrl: "https://play.rosebud.ai/assets/FrostBerry Fizz UI Card.png?Py0u"
                },
                particleAreaScaleFactor: 0.6 // Consistent with other smoke cloud product
            },
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Passion Peach.glb?VpOp', // SC-PassionFruit model
                    // textureUrl: undefined, // Ensuring no external texture is applied
                    color: 0xffffff, 
                    scale: 0.8,      // Adjusted initial scale, might need further refinement
                    yOffset: 0.8       // Adjusted initial yOffset for typical product size
                },
                message: "Smoke Cloud - Passion Peach",
                details: { 
                    title: "Smoke Cloud: Passion Peach", 
                    content: "A luscious blend of sweet passion fruit and juicy peach. A tropical delight!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Passion Peach UI Card.png?irv6"
                },
                particleAreaScaleFactor: 0.6 // Adjusted for a potentially smaller product footprint
            }
        ];
        if (!this.showroom || !this.showroom.ceilingSpotlights || this.showroom.ceilingSpotlights.length === 0) {
            console.warn("Showroom spotlights not available for object placement. Placing objects at default positions.");
            objectInfos.forEach((info, index) => {
                 const angle = (index / objectInfos.length) * Math.PI * 2;
                 const x = Math.cos(angle) * this.showroomRadius * 0.5;
                 const z = Math.sin(angle) * this.showroomRadius * 0.5;
                const interactiveObj = createInteractiveObject({
                    scene: this.scene,
                    modelUrl: info.baseProperties.modelUrl,
                    textureUrl: info.baseProperties.textureUrl, // Pass textureUrl
                    position: new THREE.Vector3(x, info.baseProperties.yOffset, z),
                    color: info.baseProperties.color,
                    scale: info.baseProperties.scale,
                    interactionMessage: info.message,
                    detailedInfo: info.details,
                    game: this,
                    particleAreaScaleFactor: info.particleAreaScaleFactor,
                    gltfLoader: this.gltfLoader, // Pass the loader
                    textureLoader: this.textureLoader // Pass the loader
                });
                this.interactiveObjects.push(interactiveObj);
            });
            // Add showroom posters after default object placement if spotlights fail
            if (this.showroom && this.showroom.interactivePosters) {
                this.interactiveObjects.push(...this.showroom.interactivePosters);
            }
            return;
        }
        const numObjectsToPlace = Math.min(objectInfos.length, this.showroom.ceilingSpotlights.length);
        // Define a specific order for spotlights to match the screenshot layout:
        // Neon Rush (left), Frost Berry Fizz (center), Passion Peach (right)
        // These indices correspond to the spotlight array from roof.js (S3, S2, S1)
        const spotlightOrder = [3, 2, 1]; 
        if (numObjectsToPlace > spotlightOrder.length) {
            console.warn("More objects to place than specified in spotlightOrder. Some objects may use default spotlighting.");
        }
        // Ensure we don't try to access spotlightOrder beyond its bounds if numObjectsToPlace is smaller
        const loopCount = Math.min(numObjectsToPlace, spotlightOrder.length);
        for (let i = 0; i < loopCount; i++) {
            const info = objectInfos[i];
            const spotlightIndex = spotlightOrder[i];
            if (spotlightIndex >= this.showroom.ceilingSpotlights.length) {
                console.warn(`Spotlight index ${spotlightIndex} is out of bounds. Skipping object ${info.message}.`);
                continue;
            }
            const spotlight = this.showroom.ceilingSpotlights[spotlightIndex]; 
            
            const objectPosition = new THREE.Vector3(
                spotlight.target.position.x,
                info.baseProperties.yOffset,
                spotlight.target.position.z
            );
            const interactiveObj = createInteractiveObject({
                scene: this.scene,
                modelUrl: info.baseProperties.modelUrl,
                textureUrl: info.baseProperties.textureUrl, // Pass textureUrl
                position: objectPosition,
                color: info.baseProperties.color,
                    scale: info.baseProperties.scale,
                    interactionMessage: info.message,
                    detailedInfo: info.details,
                    game: this,
                    particleAreaScaleFactor: info.particleAreaScaleFactor,
                    gltfLoader: this.gltfLoader, // Pass the loader
                    textureLoader: this.textureLoader // Pass the loader
                });
                this.interactiveObjects.push(interactiveObj);
        }
        // Add showroom posters to the interactive list
        if (this.showroom && this.showroom.interactivePosters) {
            this.interactiveObjects.push(...this.showroom.interactivePosters);
        }
    }
    setupStreetLamps() {
        if (!this.showroom || !this.showroom.ceilingSpotlights || this.showroom.ceilingSpotlights.length === 0) {
            console.warn("Showroom spotlights not available for street lamp placement.");
            return;
        }
        // const loader = new GLTFLoader(); // Use this.gltfLoader
        const lampUrl = 'https://play.rosebud.ai/assets/street_lamp.glb?Yxih';
        const lampScale = 1.2; // Adjust as needed
        const lampYOffset = 0; // Assuming the lamp model's origin is at its base
        // const fontLoader = new FontLoader(); // Use this.fontLoader
        // Using a default font path, ensure this font is available or replace with a known good URL
        // this.fontLoader.load('https://esm.sh/three/examples/fonts/helvetiker_regular.typeface.json', (font) => { // Font loading removed as labels are removed
            this.gltfLoader.load(lampUrl, (gltf) => {
                const lampModel = gltf.scene;
                this.showroom.ceilingSpotlights.forEach((spotlight, index) => {
                    const lampInstance = lampModel.clone();
                    lampInstance.scale.set(lampScale, lampScale, lampScale);
                    // Calculate new position closer to the wall
                    const currentLampX = spotlight.target.position.x;
                    const currentLampZ = spotlight.target.position.z;
                    const angle = Math.atan2(currentLampZ, currentLampX);
                    const newLampRadius = this.showroomRadius * 0.9; // Move lamps to 90% of showroom radius
                    const newX = Math.cos(angle) * newLampRadius;
                    const newZ = Math.sin(angle) * newLampRadius;
                    lampInstance.position.set(
                        newX,
                        lampYOffset,
                        newZ
                    );
                    // Orient the lamp to face the center of the room (0, lampYOffset, 0)
                    lampInstance.lookAt(new THREE.Vector3(0, lampYOffset, 0));
                    // Apply an additional 90-degree counter-clockwise rotation (positive angle around Y-axis)
                    lampInstance.rotateY(THREE.MathUtils.degToRad(90));
                    lampInstance.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.scene.add(lampInstance);
               
                    
                });
            }, undefined, (error) => {
                console.error(`Failed to load street lamp model from ${lampUrl}:`, error);
            });
        
    }
    setupSpeakers() {
        if (!this.showroom || !this.showroom.ceilingSpotlights || this.showroom.ceilingSpotlights.length < 5) { // Need at least 5 spotlights for original speaker placement logic
            console.warn("Showroom spotlights not available or insufficient for speaker placement.");
            return;
        }
        // const loader = new GLTFLoader(); // Use this.gltfLoader
        const speakerUrl = 'https://play.rosebud.ai/assets/speaker.glb?AVIg';
        const speakerScale = 0.3; // Scaled down to 30%
        const speakerYPosition = 0; // Assuming model's origin is at its base
        const speakerDistanceFromCenter = this.showroomRadius * 0.92;
        const numLights = this.showroom.ceilingSpotlights.length; // Typically 8
        // Define configurations for each speaker
        const speakerConfigs = [
            { // Original speaker: between lamp 4 (spotlight index 3) and lamp 5 (spotlight index 4)
                angle: (( (3 / numLights) * Math.PI * 2 ) + ( (4 / numLights) * Math.PI * 2 )) / 2,
                name: "Speaker 1 (between lamps 4-5)"
            },
            { // New speaker: between lamp 1 (spotlight index 0) and lamp 2 (spotlight index 1)
                angle: (( (0 / numLights) * Math.PI * 2 ) + ( (1 / numLights) * Math.PI * 2 )) / 2,
                name: "Speaker 2 (between lamps 1-2)"
            }
        ];
        this.gltfLoader.load(speakerUrl, (gltf) => {
            speakerConfigs.forEach(config => {
                const speakerModel = gltf.scene.clone(); // Clone the loaded model for each instance
                speakerModel.scale.set(speakerScale, speakerScale, speakerScale);
                const posX = Math.cos(config.angle) * speakerDistanceFromCenter;
                const posZ = Math.sin(config.angle) * speakerDistanceFromCenter;
                speakerModel.position.set(posX, speakerYPosition, posZ);
                // Orient the speaker to face the center of the room
                const lookAtY = speakerYPosition + (speakerScale * 0.75); // Assuming model is ~1.5 units tall before scale
                speakerModel.lookAt(new THREE.Vector3(0, lookAtY, 0));
                speakerModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                this.scene.add(speakerModel);
                console.log(`${config.name} added to scene at (${posX.toFixed(2)}, ${speakerYPosition}, ${posZ.toFixed(2)}), facing center.`);
                // Animation setup for this speaker instance
                if (gltf.animations && gltf.animations.length) {
                    const mixer = new THREE.AnimationMixer(speakerModel);
                    // Play the first animation found
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                    this.speakerMixers.push(mixer);
                    this.speakerAnimationActions.push(action); // Store the action
                    // Animations will start paused if music is initially muted, handled by toggleMute logic
                    action.paused = this.backgroundMusic ? this.backgroundMusic.getVolume() === 0 : true;
                    console.log(`Animation set up for ${config.name}. Initial paused state: ${action.paused}`);
                } else {
                    console.log(`No animations found for ${config.name}`);
                }
            });
        }, undefined, (error) => {
            console.error(`Failed to load speaker model from ${speakerUrl}:`, error);
        });
    }
    setupBackgroundMusic() {
        const listener = new THREE.AudioListener();
        this.camera.add(listener); // Attach listener to camera
        this.backgroundMusic = new THREE.Audio(listener);
        // const audioLoader = new THREE.AudioLoader(); // Use this.audioLoader
        this.audioLoader.load('https://play.rosebud.ai/assets/Cloud Drippin.mp3?2fSC', (buffer) => {
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.1); // Default volume set to 10%
            // Music will be started in startExperience()
            console.log("Background music loaded.");
        },
        (xhr) => {
            // Progress callback (optional)
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (err) => {
            console.error('An error occurred loading the background music:', err);
        });
    }
    toggleMute(isMuted) {
        if (this.backgroundMusic) {
            if (isMuted) {
                this.backgroundMusic.setVolume(0);
            } else {
                this.backgroundMusic.setVolume(0.1); // Restore to 10% volume
            }
            console.log(`Background music ${isMuted ? 'muted' : 'unmuted'}.`);
        }
        // Control speaker animations based on mute state
        this.speakerAnimationActions.forEach(action => {
            action.paused = isMuted;
        });
        // Update UI button state (optional, if ui.js doesn't already handle its own text/class)
        // setMuteButtonState(isMuted); // This line can be removed if ui.js fully manages its state
    }
    preloadUICards() {
        console.log("Preloading UI cards...");
        const objectInfos = this.getObjectInfos(); // Assuming objectInfos is accessible or returned by a method
        objectInfos.forEach(info => {
            if (info.details && info.details.uiCardUrl) {
                const img = new Image();
                img.src = info.details.uiCardUrl;
                img.onload = () => console.log(`Successfully preloaded: ${info.details.uiCardUrl}`);
                img.onerror = () => console.error(`Failed to preload: ${info.details.uiCardUrl}`);
            }
        });
    }
    
    // Helper method to get objectInfos if it's not directly on 'this'
    // or if it's defined locally in setupInteractiveObjects
    getObjectInfos() {
        // This is the same array defined in setupInteractiveObjects.
        // For robustness, it might be better to store this on `this` if accessed elsewhere,
        // but for now, duplicating its definition here for preloading is straightforward.
        return [
            {
                baseProperties: { /* ... */ },
                message: "Smoke Cloud - Neon Rush",
                details: { 
                    title: "Smoke Cloud: Neon Rush", 
                    content: "An electrifying surge of vibrant, glowing flavors. Get ready for the rush!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Neon Rush UI Card.png?cexk"
                },
                particleAreaScaleFactor: 0.6
            },
            {
                baseProperties: { /* ... */ },
                message: "Smoke Cloud - Frost Berry Fizz",
                details: { 
                    title: "Smoke Cloud: Frost Berry Fizz", 
                    content: "A chilling blast of mixed berries with an icy, fizzy finish. Refreshingly cool.",
                    uiCardUrl: "https://play.rosebud.ai/assets/FrostBerry Fizz UI Card.png?Py0u"
                },
                particleAreaScaleFactor: 0.6
            },
            {
                baseProperties: { /* ... */ },
                message: "Smoke Cloud - Passion Peach",
                details: { 
                    title: "Smoke Cloud: Passion Peach", 
                    content: "A luscious blend of sweet passion fruit and juicy peach. A tropical delight!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Passion Peach UI Card.png?irv6"
                },
                particleAreaScaleFactor: 0.6
            }
        ];
    }
    setupVolumetricFog() {
        if (this.interactiveObjects.length > 0) {
            this.volumetricFog = new VolumetricFog(this.scene, this.interactiveObjects.length, {
                // Customize fog options here if needed
                // color: 0x667799,
                // density: 0.6,
                height: 0.8, // Height of the fog cylinder
                radius: 1.2, // Radius of the fog cylinder
            });
            this.interactiveObjects.forEach((obj, index) => {
                // Calculate the visual base of the object.
                // obj.position.y is the center of the object BEFORE its yOffset (which is its final height)
                // The object's geometry is typically 1 unit tall, scaled by obj.scale.y.
                // The object's true center Y is obj.position.y (which matches its baseProperties.yOffset)
                // The object's visual base Y = obj.position.y - (obj.scale.y * 0.5)
                const fogPosition = obj.position.clone(); // Keep X and Z from object
                // Position the VolumetricFog base at the floor level (Y=0).
                // The VolumetricFog cylinder's origin is already at its base due to geometry.translate() in its constructor.
                fogPosition.y = 0.0; // Base of volumetric fog cylinder at floor level.
                // Use the object's scale to influence fog scale, ensuring it's reasonable.
                // Using X-scale as a representative for the fog's radius.
                const baseFogScale = obj.scale.x * 1.5; 
                // Apply the custom scale factor if available from userData
                const customSmokeScale = obj.userData.particleAreaScaleFactor || 1.0;
                const finalFogScale = baseFogScale * customSmokeScale;
                this.volumetricFog.updateInstanceTransform(index, fogPosition, finalFogScale);
            });
        }
    }
    openInfoPanel(title, content, imageUrl) {
        this.infoPanelActive = true;
        showInfoPanel(title, content, imageUrl);
        this.firstPersonController.disablePointerLock(); // Release pointer lock
    }
    closeInfoPanel() {
        this.infoPanelActive = false;
        hideInfoPanel();
        this.firstPersonController.requestPointerLock(); // Re-acquire pointer lock
    }
    
    handlePlayerWallCollision() {
        const playerPos = this.player.position;
        const effectiveRadius = this.showroom.radius - PLAYER_RADIUS;
        
        const distSq = playerPos.x * playerPos.x + playerPos.z * playerPos.z;
        if (distSq > effectiveRadius * effectiveRadius) {
            const angle = Math.atan2(playerPos.z, playerPos.x);
            playerPos.x = Math.cos(angle) * effectiveRadius;
            playerPos.z = Math.sin(angle) * effectiveRadius;
            // PlayerController handles Y, so no need to touch playerPos.y here unless bumping head
        }
    }
    handleInteractions(deltaTime) {
        if (this.infoPanelActive) {
            hideInteractionPrompt(); // Hide prompt if panel is open
            return; // Don't process further interactions if panel is open
        }
        let canInteractWithSomething = false;
        let closestInteractiveObject = null;
        let minDistanceSq = Infinity;
        this.interactiveObjects.forEach(obj => {
            const distanceSq = this.player.position.distanceToSquared(obj.position);
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestInteractiveObject = obj;
            }
            // Simple hover animation for all interactive objects
             if (obj.userData.animateHover) {
                obj.userData.animateHover(deltaTime);
            }
        });
        if (closestInteractiveObject && minDistanceSq < (closestInteractiveObject.userData.interactionDistance || 2.5) * (closestInteractiveObject.userData.interactionDistance || 2.5)) {
            canInteractWithSomething = true;
            const interactKeyText = "Press E"; // Default to desktop interaction key
            updateInteractionPromptText(`${interactKeyText} to inspect ${closestInteractiveObject.userData.interactionMessage}`);
            showInteractionPrompt();
            // Desktop interaction
            if (this.keys['KeyE'] && closestInteractiveObject.userData.onInteract) {
                closestInteractiveObject.userData.onInteract(this);
                this.keys['KeyE'] = false; // Consume E press
            }
            // Mobile interaction specific code removed
        }
        if (!canInteractWithSomething) {
            hideInteractionPrompt();
        }
    }
    // registerMobileUpdate(callback) removed
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta();
        let cameraYaw = 0;
        // FPC update logic, primarily for desktop mouse input now.
        // firstPersonController.update() applies mouse rotations and returns the yaw for player movement.
        if (this.firstPersonController.enabled && !this.infoPanelActive) {
            cameraYaw = this.firstPersonController.update();
        } else if (this.infoPanelActive) {
            // When info panel is active, use the player's current rotation to prevent view snapping
            // This ensures playerController doesn't receive a potentially zero/stale cameraYaw
            // if FPC wasn't updated.
            cameraYaw = this.player.rotation.y;
        }
        
        if (!this.infoPanelActive) {
            this.playerController.update(deltaTime, cameraYaw);
            this.handlePlayerWallCollision();
        }
        // if (this.showroom) { // Showroom animations could be re-added here if needed
        // }
        if (this.volumetricFog) {
            this.volumetricFog.update(deltaTime);
        }
        if (this.speakerMixers.length > 0) {
            this.speakerMixers.forEach(mixer => mixer.update(deltaTime));
        }
        // Removed mobileUpdateCallbacks loop
        this.handleInteractions(deltaTime); // Handle interactions (prompt visibility, opening panel)
        this.renderer.render(this.scene, this.camera);
    }
    // Initial start method for the game, will show welcome screen
    start() {
        showWelcomeScreen();
        // The animate() loop will be started by startExperience() after welcome screen.
        // We can render a static first frame if desired, or just let the welcome screen cover it.
        this.renderer.render(this.scene, this.camera); // Render once to show initial scene behind welcome
        // Set initial mute button state if music is loaded and playing (or not)
        if (this.backgroundMusic && this.backgroundMusic.source && this.backgroundMusic.source.buffer) {
           setMuteButtonState(this.backgroundMusic.getVolume() === 0);
        } else {
            setMuteButtonState(false); // Default to not muted if music isn't ready
        }
    }
}