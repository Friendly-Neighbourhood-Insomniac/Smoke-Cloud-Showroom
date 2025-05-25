import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { PlayerController, FirstPersonCameraController } from './rosieControls.js';
import { setupSceneLighting } from './sceneSetup.js';
import { Showroom } from './showroom.js';
import { createInteractiveObject } from './interactiveObject.js';
import { VolumetricFog } from './VolumetricFog.js';
import loadingManager from './loadingManager.js';
import { showInteractionPrompt, hideInteractionPrompt, updateInteractionPromptText, initInfoPanel, showInfoPanel, hideInfoPanel, initWelcomeScreen, showWelcomeScreen, initAudioControls, setMuteButtonState, disableStartButton, updateLoadingProgress } from './ui.js';
import { isMobileDevice, VirtualJoystick } from './utils.js';

const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.4;

export class Game {
    constructor() {
        this.isMobile = isMobileDevice();
        this.infoPanelActive = false;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.keys = {};
        this.interactiveObjects = [];
        this.speakerMixers = [];
        this.speakerAnimationActions = [];
        this.showroomRadius = 10;

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
        this.setupSpeakers();
        this.setupBackgroundMusic();

        initInfoPanel(this.closeInfoPanel.bind(this));
        initWelcomeScreen(this.startExperience.bind(this));
        initAudioControls(this.toggleMute.bind(this));

        if (this.isMobile) {
            this.setupMobileControls();
        }

        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape' && this.infoPanelActive) {
                this.closeInfoPanel();
            }
        });
        document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    setupMobileControls() {
        this.joystick = new VirtualJoystick(document.body);
        
        const touchCameraArea = document.getElementById('touch-camera-area');
        let lastTouchX = 0;
        let lastTouchY = 0;

        touchCameraArea.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        });

        touchCameraArea.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent default touch behavior
            if (this.infoPanelActive) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;

            if (this.firstPersonController) {
                // Increase sensitivity for mobile
                this.firstPersonController.rotationY -= deltaX * 0.01;
                this.firstPersonController.rotationX -= deltaY * 0.01;
                this.firstPersonController.rotationX = Math.max(
                    -Math.PI / 2 + 0.01,
                    Math.min(Math.PI / 2 - 0.01, this.firstPersonController.rotationX)
                );
            }

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        });

        touchCameraArea.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default touch behavior
        });

        const mobileInteractButton = document.getElementById('mobile-interact-button');
        mobileInteractButton.style.display = 'flex';
        mobileInteractButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['KeyE'] = true;
        });
        mobileInteractButton.addEventListener('touchend', () => {
            this.keys['KeyE'] = false;
        });

        // Show touch controls container
        const touchControls = document.getElementById('touch-controls');
        if (touchControls) {
            touchControls.style.display = 'block';
        }

        this.joystick.show();
    }

    startExperience() {
        console.log("Experience started!");
        if (!this.isMobile) {
            this.firstPersonController.requestPointerLock();
        }
        
        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
            if (this.backgroundMusic.getVolume() > 0) {
                this.speakerAnimationActions.forEach(action => {
                    action.paused = false;
                });
            }
        }

        if (!this.animationFrameId) {
            this.animate();
        }
    }

    setupEnvironment() {
        setupSceneLighting(this.scene);
        this.showroom = new Showroom(this.scene, this.showroomRadius, 4, 64, this.textureLoader);
        this.scene.background = new THREE.Color(0x1a1a2a);
    }

    setupPlayerAndControls() {
        const playerGeometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - 2 * PLAYER_RADIUS, 4, 8);
        playerGeometry.translate(0, PLAYER_HEIGHT / 2, 0);
        const playerMaterial = new THREE.MeshStandardMaterial({ visible: false });
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.position.set(0, 0, -3);
        this.player.rotation.y = Math.PI;
        this.scene.add(this.player);

        this.playerController = new PlayerController(this.player, this.keys, {
            moveSpeed: 5,
            jumpForce: 8,
            gravity: 25,
            groundLevel: 0
        });

        this.firstPersonController = new FirstPersonCameraController(this.camera, this.player, this.renderer.domElement, {
            eyeHeight: PLAYER_HEIGHT * 0.85,
            mouseSensitivity: 0.002
        });
        
        this.firstPersonController.enable();
        this.playerController.setCameraMode('first-person');
        this.firstPersonController.rotationY = this.player.rotation.y;
        this.firstPersonController.rotationX = 0.1;
    }

    setupInteractiveObjects() {
        const objectInfos = [
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Neon Rush.glb?T67Z',
                    color: 0xffffff,
                    scale: 0.8,
                    yOffset: 0.8
                },
                message: "Smoke Cloud - Neon Rush",
                details: {
                    title: "Smoke Cloud: Neon Rush",
                    content: "An electrifying surge of vibrant, glowing flavors. Get ready for the rush!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Neon Rush UI Card.png?cexk"
                },
                particleAreaScaleFactor: 0.6
            },
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Frost Berry Fizz.glb?vic7',
                    color: 0xffffff,
                    scale: 0.8,
                    yOffset: 0.8
                },
                message: "Smoke Cloud - Frost Berry Fizz",
                details: {
                    title: "Smoke Cloud: Frost Berry Fizz",
                    content: "A chilling blast of mixed berries with an icy, fizzy finish. Refreshingly cool.",
                    uiCardUrl: "https://play.rosebud.ai/assets/FrostBerry Fizz UI Card.png?Py0u"
                },
                particleAreaScaleFactor: 0.6
            },
            {
                baseProperties: {
                    modelUrl: 'https://play.rosebud.ai/assets/Smoke Cloud Passion Peach.glb?VpOp',
                    color: 0xffffff,
                    scale: 0.8,
                    yOffset: 0.8
                },
                message: "Smoke Cloud - Passion Peach",
                details: {
                    title: "Smoke Cloud: Passion Peach",
                    content: "A luscious blend of sweet passion fruit and juicy peach. A tropical delight!",
                    uiCardUrl: "https://play.rosebud.ai/assets/Passion Peach UI Card.png?irv6"
                },
                particleAreaScaleFactor: 0.6
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
                    textureUrl: info.baseProperties.textureUrl,
                    position: new THREE.Vector3(x, info.baseProperties.yOffset, z),
                    color: info.baseProperties.color,
                    scale: info.baseProperties.scale,
                    interactionMessage: info.message,
                    detailedInfo: info.details,
                    game: this,
                    particleAreaScaleFactor: info.particleAreaScaleFactor,
                    gltfLoader: this.gltfLoader,
                    textureLoader: this.textureLoader
                });
                this.interactiveObjects.push(interactiveObj);
            });
            if (this.showroom && this.showroom.interactivePosters) {
                this.interactiveObjects.push(...this.showroom.interactivePosters);
            }
            return;
        }

        const numObjectsToPlace = Math.min(objectInfos.length, this.showroom.ceilingSpotlights.length);
        const spotlightOrder = [3, 2, 1];
        if (numObjectsToPlace > spotlightOrder.length) {
            console.warn("More objects to place than specified in spotlightOrder. Some objects may use default spotlighting.");
        }

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
                textureUrl: info.baseProperties.textureUrl,
                position: objectPosition,
                color: info.baseProperties.color,
                scale: info.baseProperties.scale,
                interactionMessage: info.message,
                detailedInfo: info.details,
                game: this,
                particleAreaScaleFactor: info.particleAreaScaleFactor,
                gltfLoader: this.gltfLoader,
                textureLoader: this.textureLoader
            });
            this.interactiveObjects.push(interactiveObj);
        }

        if (this.showroom && this.showroom.interactivePosters) {
            this.interactiveObjects.push(...this.showroom.interactivePosters);
        }
    }

    setupStreetLamps() {
        if (!this.showroom || !this.showroom.ceilingSpotlights || this.showroom.ceilingSpotlights.length === 0) {
            console.warn("Showroom spotlights not available for street lamp placement.");
            return;
        }

        const lampUrl = 'https://play.rosebud.ai/assets/street_lamp.glb?Yxih';
        const lampScale = 1.2;
        const lampYOffset = 0;

        this.gltfLoader.load(lampUrl, (gltf) => {
            const lampModel = gltf.scene;
            this.showroom.ceilingSpotlights.forEach((spotlight, index) => {
                const lampInstance = lampModel.clone();
                lampInstance.scale.set(lampScale, lampScale, lampScale);
                const currentLampX = spotlight.target.position.x;
                const currentLampZ = spotlight.target.position.z;
                const angle = Math.atan2(currentLampZ, currentLampX);
                const newLampRadius = this.showroomRadius * 0.9;
                const newX = Math.cos(angle) * newLampRadius;
                const newZ = Math.sin(angle) * newLampRadius;
                lampInstance.position.set(
                    newX,
                    lampYOffset,
                    newZ
                );
                lampInstance.lookAt(new THREE.Vector3(0, lampYOffset, 0));
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
        if (!this.showroom || !this.showroom.ceilingSpotlights || this.showroom.ceilingSpotlights.length < 5) {
            console.warn("Showroom spotlights not available or insufficient for speaker placement.");
            return;
        }

        const speakerUrl = 'https://play.rosebud.ai/assets/speaker.glb?AVIg';
        const speakerScale = 0.3;
        const speakerYPosition = 0;
        const speakerDistanceFromCenter = this.showroomRadius * 0.92;
        const numLights = this.showroom.ceilingSpotlights.length;

        const speakerConfigs = [
            {
                angle: (((3 / numLights) * Math.PI * 2) + ((4 / numLights) * Math.PI * 2)) / 2,
                name: "Speaker 1 (between lamps 4-5)"
            },
            {
                angle: (((0 / numLights) * Math.PI * 2) + ((1 / numLights) * Math.PI * 2)) / 2,
                name: "Speaker 2 (between lamps 1-2)"
            }
        ];

        this.gltfLoader.load(speakerUrl, (gltf) => {
            speakerConfigs.forEach(config => {
                const speakerModel = gltf.scene.clone();
                speakerModel.scale.set(speakerScale, speakerScale, speakerScale);
                const posX = Math.cos(config.angle) * speakerDistanceFromCenter;
                const posZ = Math.sin(config.angle) * speakerDistanceFromCenter;
                speakerModel.position.set(posX, speakerYPosition, posZ);
                const lookAtY = speakerYPosition + (speakerScale * 0.75);
                speakerModel.lookAt(new THREE.Vector3(0, lookAtY, 0));
                speakerModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                this.scene.add(speakerModel);
                console.log(`${config.name} added to scene at (${posX.toFixed(2)}, ${speakerYPosition}, ${posZ.toFixed(2)}), facing center.`);

                if (gltf.animations && gltf.animations.length) {
                    const mixer = new THREE.AnimationMixer(speakerModel);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                    this.speakerMixers.push(mixer);
                    this.speakerAnimationActions.push(action);
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
        this.camera.add(listener);
        this.backgroundMusic = new THREE.Audio(listener);

        this.audioLoader.load('https://play.rosebud.ai/assets/Cloud Drippin.mp3?2fSC', (buffer) => {
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.1);
            console.log("Background music loaded.");
        },
        (xhr) => {
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
                this.backgroundMusic.setVolume(0.1);
            }
            console.log(`Background music ${isMuted ? 'muted' : 'unmuted'}.`);
        }
        this.speakerAnimationActions.forEach(action => {
            action.paused = isMuted;
        });
    }

    preloadUICards() {
        console.log("Preloading UI cards...");
        const objectInfos = this.getObjectInfos();
        objectInfos.forEach(info => {
            if (info.details && info.details.uiCardUrl) {
                const img = new Image();
                img.src = info.details.uiCardUrl;
                img.onload = () => console.log(`Successfully preloaded: ${info.details.uiCardUrl}`);
                img.onerror = () => console.error(`Failed to preload: ${info.details.uiCardUrl}`);
            }
        });
    }

    getObjectInfos() {
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
                height: 0.8,
                radius: 1.2,
            });
            this.interactiveObjects.forEach((obj, index) => {
                const fogPosition = obj.position.clone();
                fogPosition.y = 0.0;
                const baseFogScale = obj.scale.x * 1.5;
                const customSmokeScale = obj.userData.particleAreaScaleFactor || 1.0;
                const finalFogScale = baseFogScale * customSmokeScale;
                this.volumetricFog.updateInstanceTransform(index, fogPosition, finalFogScale);
            });
        }
    }

    openInfoPanel(title, content, imageUrl) {
        this.infoPanelActive = true;
        showInfoPanel(title, content, imageUrl);
        this.firstPersonController.disablePointerLock();
    }

    closeInfoPanel() {
        this.infoPanelActive = false;
        hideInfoPanel();
        this.firstPersonController.requestPointerLock();
    }

    handlePlayerWallCollision() {
        const playerPos = this.player.position;
        const effectiveRadius = this.showroom.radius - PLAYER_RADIUS;
        
        const distSq = playerPos.x * playerPos.x + playerPos.z * playerPos.z;
        if (distSq > effectiveRadius * effectiveRadius) {
            const angle = Math.atan2(playerPos.z, playerPos.x);
            playerPos.x = Math.cos(angle) * effectiveRadius;
            playerPos.z = Math.sin(angle) * effectiveRadius;
        }
    }

    handleInteractions(deltaTime) {
        if (this.infoPanelActive) {
            hideInteractionPrompt();
            return;
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
            if (obj.userData.animateHover) {
                obj.userData.animateHover(deltaTime);
            }
        });
        if (closestInteractiveObject && minDistanceSq < (closestInteractiveObject.userData.interactionDistance || 2.5) * (closestInteractiveObject.userData.interactionDistance || 2.5)) {
            canInteractWithSomething = true;
            const interactKeyText = "Press E";
            updateInteractionPromptText(`${interactKeyText} to inspect ${closestInteractiveObject.userData.interactionMessage}`);
            showInteractionPrompt();
            if (this.keys['KeyE'] && closestInteractiveObject.userData.onInteract) {
                closestInteractiveObject.userData.onInteract(this);
                this.keys['KeyE'] = false;
            }
        }
        if (!canInteractWithSomething) {
            hideInteractionPrompt();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const deltaTime = this.clock.getDelta();
        let cameraYaw = 0;

        if (this.firstPersonController.enabled && !this.infoPanelActive) {
            cameraYaw = this.firstPersonController.update();
        } else if (this.infoPanelActive) {
            cameraYaw = this.player.rotation.y;
        }

        if (!this.infoPanelActive) {
            if (this.isMobile) {
                const joystickInput = this.joystick.getInput();
                this.keys['KeyW'] = joystickInput.y > 0;
                this.keys['KeyS'] = joystickInput.y < 0;
                this.keys['KeyA'] = joystickInput.x < 0;
                this.keys['KeyD'] = joystickInput.x > 0;
            }

            this.playerController.update(deltaTime, cameraYaw);
            this.handlePlayerWallCollision();
        }

        if (this.volumetricFog) {
            this.volumetricFog.update(deltaTime);
        }

        if (this.speakerMixers.length > 0) {
            this.speakerMixers.forEach(mixer => mixer.update(deltaTime));
        }

        this.handleInteractions(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        showWelcomeScreen();
        this.renderer.render(this.scene, this.camera);
        if (this.backgroundMusic && this.backgroundMusic.source && this.backgroundMusic.source.buffer) {
            setMuteButtonState(this.backgroundMusic.getVolume() === 0);
        } else {
            setMuteButtonState(false);
        }
    }
}