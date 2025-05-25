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

        // Initialize audio context on user interaction for mobile
        this.audioContextInitialized = false;
        if (this.isMobile) {
            const initAudioContext = () => {
                if (!this.audioContextInitialized) {
                    const audioContext = THREE.AudioContext.getContext();
                    if (audioContext.state === 'suspended') {
                        audioContext.resume();
                    }
                    this.audioContextInitialized = true;
                    document.removeEventListener('touchstart', initAudioContext);
                }
            };
            document.addEventListener('touchstart', initAudioContext);
        }

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

    setupEnvironment() {
        // Set up basic environment
        this.scene.background = new THREE.Color(0x000000);
        
        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Setup scene lighting
        setupSceneLighting(this.scene);
    }

    startExperience() {
        console.log("Experience started!");
        if (!this.isMobile) {
            this.firstPersonController.requestPointerLock();
        } else {
            document.getElementById('touch-controls').style.display = 'block';
        }
        
        // Initialize and play background music
        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
            const audioContext = THREE.AudioContext.getContext();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
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

    // ... (rest of the original implementation remains unchanged)
}