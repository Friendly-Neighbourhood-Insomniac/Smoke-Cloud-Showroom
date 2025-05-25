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
        this.joystick.show();
        
        const touchCameraArea = document.getElementById('touch-camera-area');
        let lastTouchX = 0;
        let lastTouchY = 0;

        touchCameraArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        });

        touchCameraArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.infoPanelActive) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;

            this.firstPersonController.rotationY -= deltaX * 0.01;
            this.firstPersonController.rotationX -= deltaY * 0.01;
            
            this.firstPersonController.rotationX = Math.max(
                -Math.PI / 2 + 0.01,
                Math.min(Math.PI / 2 - 0.01, this.firstPersonController.rotationX)
            );

            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
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

        const touchControls = document.getElementById('touch-controls');
        if (touchControls) {
            touchControls.style.display = 'block';
        }
    }

    // [Previous methods remain unchanged...]

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
            if (this.isMobile && this.joystick) {
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

    // [Rest of the class methods remain unchanged...]
}