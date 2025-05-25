import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// FBXLoader import removed
import { FogParticleSystem } from './particleEffects.js';
const defaultInteractionDistance = 2.5; // Meters
// GLTFLoader and TextureLoader instances will be passed in.
function setupInteractiveMeshProperties(mesh, color, scale, position) {
    mesh.scale.set(scale, scale, scale);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Apply color and emissive properties if the model doesn't have its own complex materials
    // or if we want to override/enhance them.
    mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    return mesh;
}
export function createInteractiveObject({ 
    scene, modelUrl, textureUrl, position, color, scale = 1, 
    interactionMessage = "Object", detailedInfo, game, particleAreaScaleFactor,
    gltfLoader, // Added parameter
    textureLoader // Added parameter
}) {
    const currentGltfLoader = gltfLoader || new GLTFLoader(); // Use passed or new
    const currentTextureLoader = textureLoader || new THREE.TextureLoader(); // Use passed or new
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    objectGroup.position.copy(position); // Position the group initially
    let uniqueInteractionAnimation = null; 
    let specificInteraction = (targetMesh) => {
        if (game && detailedInfo) {
            game.openInfoPanel(detailedInfo.title, detailedInfo.content, detailedInfo.uiCardUrl);
        } else {
            console.log(`Interacted with ${interactionMessage}, but no detailed info or game context provided.`);
        }
        if (uniqueInteractionAnimation) {
            uniqueInteractionAnimation(targetMesh || objectGroup.children[0]); // Pass the actual model mesh
        } else { 
            const modelMesh = targetMesh || objectGroup.children[0];
            if (modelMesh && modelMesh.material) { // Check if modelMesh and its material exist
                 // Default simple visual feedback if no unique animation
                const originalEmissiveMap = modelMesh.material.emissiveMap; // Store original emissive map
                const originalEmissiveIntensity = modelMesh.material.emissiveIntensity;
                const originalEmissive = modelMesh.material.emissive ? modelMesh.material.emissive.clone() : new THREE.Color(0x000000);
                modelMesh.material.emissive = new THREE.Color(0xffffff); // Bright white emissive
                modelMesh.material.emissiveIntensity = 1.0;
                modelMesh.material.emissiveMap = null; // Temporarily remove emissive map if any
                setTimeout(() => {
                    if (modelMesh.material) { // Check again in timeout
                        modelMesh.material.emissive = originalEmissive;
                        modelMesh.material.emissiveIntensity = originalEmissiveIntensity;
                        modelMesh.material.emissiveMap = originalEmissiveMap; // Restore emissive map
                    }
                }, 200);
            }
        }
    };
    const basePositionY = position.y; // For hover animation, relative to initial group position.
    let hoverAnimation = (deltaTime) => {
        if (objectGroup.children.length > 0) {
            objectGroup.children[0].rotation.y += 0.5 * deltaTime; // Gentle spin on the model itself
        }
        // Bob the entire group
        objectGroup.position.y = basePositionY + Math.sin(Date.now() * 0.002) * 0.05; 
    };
    
    let fogSystem = null; 
    
    const modelLoadCallback = (loadedModel) => {
        // GLTFLoader returns an object with a 'scene' property.
        const processedModel = loadedModel.scene;
        // Diagnostic logs for Smoke Cloud Neon Rush
        if (modelUrl && modelUrl.includes('Smoke Cloud Neon Rush')) {
            console.log(`[Neon Rush Debug] Loaded model for URL: ${modelUrl}`);
            console.log(`[Neon Rush Debug] processedModel:`, processedModel);
            if (processedModel && processedModel.children) {
                console.log(`[Neon Rush Debug] processedModel children count: ${processedModel.children.length}`);
                processedModel.children.forEach((child, index) => {
                    console.log(`[Neon Rush Debug] Child ${index}: type=${child.type}, name=${child.name}, visible=${child.visible}`);
                    if (child.isMesh) {
                        console.log(`[Neon Rush Debug] Child ${index} isMesh: material=`, child.material);
                    }
                });
            } else {
                console.log(`[Neon Rush Debug] processedModel is null or has no children property.`);
            }
            const tempBox = new THREE.Box3().setFromObject(processedModel); // Ensure THREE.Box3 is used
            const tempSize = new THREE.Vector3();
            tempBox.getSize(tempSize);
            console.log(`[Neon Rush Debug] Bounding box size: x=${tempSize.x}, y=${tempSize.y}, z=${tempSize.z}`);
        }
        setupInteractiveMeshProperties(processedModel, color, scale, new THREE.Vector3(0,0,0));
        objectGroup.add(processedModel);
        if (textureUrl) {
            // const textureLoader = new THREE.TextureLoader(); // Use currentTextureLoader
            currentTextureLoader.load(textureUrl, (texture) => {
                texture.flipY = false; 
                texture.colorSpace = THREE.SRGBColorSpace; // Use colorSpace instead of encoding for Three r152+
                texture.needsUpdate = true;
                processedModel.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material.isMeshStandardMaterial) {
                            child.material = child.material.clone(); 
                        } else {
                            child.material = new THREE.MeshStandardMaterial();
                        }
                        child.material.map = texture;
                        child.material.color.set(0xffffff); 
                        child.material.metalness = 0.0;     
                        child.material.roughness = 0.7;   
                        child.material.needsUpdate = true;
                    }
                });
            }, undefined, (error) => {
                console.error(`An error happened loading texture ${textureUrl}:`, error);
            });
        }
        const box = new THREE.Box3().setFromObject(processedModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const particleSystemBasePosition = objectGroup.position.clone();
        particleSystemBasePosition.y = 0.0;
        
        const currentParticleAreaScaleFactor = particleAreaScaleFactor || 1.0;
        fogSystem = new FogParticleSystem(scene, particleSystemBasePosition, {
            particleCount: 84, 
            areaRadius: size.x * 0.78 * currentParticleAreaScaleFactor,
            particleBaseSize: size.y * 0.08, 
            maxLife: 2.5 / 1.4, 
            emissionYOffset: 0 
        });
        objectGroup.userData.fogSystem = fogSystem;
    };
    const modelLoadErrorCallback = (error) => {
        console.error(`An error happened loading ${modelUrl}:`, error);
        const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        setupInteractiveMeshProperties(fallbackMesh, color, scale, new THREE.Vector3(0,0,0));
        objectGroup.add(fallbackMesh);
    };
    if (modelUrl) {
        currentGltfLoader.load(modelUrl, modelLoadCallback, undefined, modelLoadErrorCallback);
    } else {
        console.warn("No modelUrl provided for interactive object. Creating a placeholder.");
        const fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: color || 0x00ff00 });
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        setupInteractiveMeshProperties(fallbackMesh, color, scale, new THREE.Vector3(0,0,0));
        objectGroup.add(fallbackMesh);
    }
    // Assign userData to the group, which is the main handle for the object
    objectGroup.userData = {
        isInteractive: true,
        interactionMessage: interactionMessage,
        onInteract: () => specificInteraction(objectGroup.children.length > 0 ? objectGroup.children[0] : null),
        interactionDistance: defaultInteractionDistance,
        animateHover: (deltaTime) => {
            hoverAnimation(deltaTime);
            if (objectGroup.userData.fogSystem) { // Check if fogSystem is initialized
                objectGroup.userData.fogSystem.update(deltaTime);
            }
        },
        detailedInfo: detailedInfo,
        fogSystem: null, // Will be assigned after model load
        particleAreaScaleFactor: particleAreaScaleFactor || 1.0 // Store for access by other systems (e.g., volumetric fog)
    };
    // We return the group. The game loop will interact with this group.
    return objectGroup;
}