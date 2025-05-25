import * as THREE from 'three';
import { createDomeCeiling, createCeilingLights } from './roof.js'; 
export class Showroom {
    constructor(scene, radius = 10, height = 4, wallSegments = 64, textureLoader) {
        this.scene = scene;
        this.radius = radius;
        this.height = height; 
        this.wallSegmentsCount = wallSegments;
        this.textureLoader = textureLoader || new THREE.TextureLoader(); // Use passed loader or create new
        this.interactivePosters = []; 
        this.createFloor();
        this.createWalls();
        const domeBaseY = this.height; 
        this.domeCeiling = createDomeCeiling(this.scene, this.radius, domeBaseY, this.wallSegmentsCount, this.textureLoader); // Pass loader
        
        const transparentLightPlaneGeo = new THREE.CircleGeometry(this.radius, this.wallSegmentsCount);
        const transparentLightPlaneMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        this.transparentLightPlane = new THREE.Mesh(transparentLightPlaneGeo, transparentLightPlaneMat);
        this.transparentLightPlane.rotation.x = -Math.PI / 2; 
        this.transparentLightPlane.position.y = this.height; 
        this.scene.add(this.transparentLightPlane);
        
        const ceilingLightData = createCeilingLights(this.scene, this.radius, this.height);
        this.ceilingLightMeshes = ceilingLightData.lightMeshes;
        this.ceilingSpotlights = ceilingLightData.spotlights;
        
        this._createWallPosters();
    }
    _addPosterToSegment(targetSegmentIndex, posterAssetUrl, interactionMessage, detailTitle) {
        const posterTexture = this.textureLoader.load(posterAssetUrl);
        posterTexture.colorSpace = THREE.SRGBColorSpace;
        const posterAspectRatio = 1536 / 1024; // height / width
        const segmentAngle = (Math.PI * 2) / this.wallSegmentsCount;
        const segmentWidth = 2 * this.radius * Math.sin(segmentAngle / 2);
        const posterPlaneWidth = segmentWidth * 0.85;
        const posterPlaneHeight = posterPlaneWidth * posterAspectRatio;
        const posterGeometry = new THREE.PlaneGeometry(posterPlaneWidth, posterPlaneHeight);
        const posterMaterial = new THREE.MeshStandardMaterial({
            map: posterTexture,
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.1,
            side: THREE.FrontSide,
        });
        const posterMesh = new THREE.Mesh(posterGeometry, posterMaterial);
        posterMesh.castShadow = false;
        posterMesh.receiveShadow = true;
        const angleForSegmentCenter = targetSegmentIndex * segmentAngle + segmentAngle / 2;
        const posterRadiusOffset = 0.02; 
        posterMesh.position.x = (this.radius - posterRadiusOffset) * Math.cos(angleForSegmentCenter);
        posterMesh.position.z = (this.radius - posterRadiusOffset) * Math.sin(angleForSegmentCenter);
        posterMesh.position.y = this.height / 2 + (Math.random() - 0.5) * 0.1;
        posterMesh.lookAt(new THREE.Vector3(0, posterMesh.position.y, 0));
        posterMesh.rotateZ(THREE.MathUtils.degToRad((Math.random() - 0.5) * 5));
        // Make the poster interactive
        posterMesh.userData = {
            isInteractive: true,
            interactionMessage: interactionMessage,
            interactionDistance: 2.0, // Slightly shorter distance for posters
            onInteract: (gameInstance) => {
                if (gameInstance && gameInstance.openInfoPanel) {
                    // For posters, we only need to show the image. Title and content can be minimal or derived.
                    gameInstance.openInfoPanel(detailTitle, "", posterAssetUrl);
                }
            },
            // Posters don't need a complex hover animation like products,
            // but we can add a simple one if desired, or leave animateHover null.
            animateHover: null 
        };
        this.scene.add(posterMesh);
        this.interactivePosters.push(posterMesh); // Add to our list
    }
_createWallPosters() {
    const posterAssetUrl = 'https://play.rosebud.ai/assets/Poster.png?v6t7'; // Default poster image
    const wallSegments = this.wallSegmentsCount;
    // Poster 1: Directly IN FRONT of player (on the wall in World +Z direction)
    const frontSegment = Math.floor(wallSegments * (1/4)); // Segment index for angle PI/2
    this._addPosterToSegment(frontSegment, posterAssetUrl, "Main Exhibit View", "Spotlight Art: Center Stage");
    // Poster 2: Directly TO PLAYER'S LEFT (on the wall in World +X direction)
    const leftSegment = 0; // Segment index for angle 0
    this._addPosterToSegment(leftSegment, posterAssetUrl, "Gallery Left Wing", "Perspectives: From the Left");
    // Poster 3: Directly TO PLAYER'S RIGHT (on the wall in World -X direction)
    const rightSegment = Math.floor(wallSegments * (1/2)); // Segment index for angle PI
    this._addPosterToSegment(rightSegment, posterAssetUrl, "Gallery Right Wing", "Perspectives: From the Right");
    // Poster 4: Directly BEHIND player (on the wall in World -Z direction)
    const behindSegment = Math.floor(wallSegments * (3/4)); // Segment index for angle 3PI/2
    this._addPosterToSegment(behindSegment, posterAssetUrl, "Entrance Wall Display", "Retrospective: A Look Back");
}
    createFloor() {
// Note: Changed method signature to use this.radius and this.wallSegmentsCount
        const floorGeometry = new THREE.CircleGeometry(this.radius, this.wallSegmentsCount);
        const textureLoader = new THREE.TextureLoader();
        const floorTexture = textureLoader.load('https://play.rosebud.ai/assets/floor.png?9SaC');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(this.radius / 4, this.radius / 4); // Adjust repeat based on radius for better tiling
        floorTexture.colorSpace = THREE.SRGBColorSpace;
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            color: 0xffffff, // Set to white to show texture colors accurately
            metalness: 0.1,  // Lower metalness for a less shiny floor
            roughness: 0.8,  // Increase roughness for a more matte, textured look
            side: THREE.DoubleSide
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotation.x = -Math.PI / 2; // Orient correctly
        floorMesh.position.y = 0; // Floor at y=0
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
        // Neon grid removed as per request
    }
    createWalls() {
// Note: Changed method signature to use this.radius, this.height, and this.wallSegmentsCount
        this.wallSegments = [];
        const segmentAngle = (Math.PI * 2) / this.wallSegmentsCount;
        const segmentWidth = 2 * this.radius * Math.sin(segmentAngle / 2); // Width of each flat panel
        const textureLoader = new THREE.TextureLoader();
        const wallTextureUrls = [
            'https://play.rosebud.ai/assets/Wall1.png?JTgl',  // Front-right quadrant (0 to PI/2), will show right half of Wall1
            'https://play.rosebud.ai/assets/Wall1.png?JTgl',  // Front-left quadrant (PI/2 to PI), will show left half of Wall1
            'https://play.rosebud.ai/assets/Wall2.png?Jgng',  // Back-left quadrant (PI to 3PI/2)
            'https://play.rosebud.ai/assets/Wall3.png?EvPg'   // Back-right quadrant (3PI/2 to 2PI)
        ];
        // Load all textures and combine them into a single "master" texture for the panorama
        // This is a conceptual step. For true panoramic mapping with multiple images,
        // we adjust UVs per segment to pick from the correct part of a *conceptual* larger texture.
        // Or, more practically for multiple distinct images, assign one texture per *group* of segments.
        // For this implementation, we'll map each segment to a *portion* of the panoramic sequence.
        // The number of images in our panoramic sequence
        const numPanoramicImages = wallTextureUrls.length;
        // Load textures
        const panoramicTextures = wallTextureUrls.map(url => {
            const texture = textureLoader.load(url);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.ClampToEdgeWrapping; // Important for non-tiling panorama sections
            texture.wrapT = THREE.ClampToEdgeWrapping;
            return texture;
        });
        for (let i = 0; i < this.wallSegmentsCount; i++) {
            const angle = i * segmentAngle;
            // Determine which of the 4 textures this segment belongs to
            // The fraction of the circle this segment represents, normalized from 0 to 1
            const panoramicProgress = i / this.wallSegmentsCount; 
            // Map this progress to an index in our panoramicTextures array
            const textureIndex = Math.floor(panoramicProgress * numPanoramicImages);
            const currentTexture = panoramicTextures[textureIndex % numPanoramicImages]; // Ensure index is valid
            const wallMaterial = new THREE.MeshStandardMaterial({
                map: currentTexture,
                color: 0xffffff,
                metalness: 0.1,
                roughness: 0.8,
                side: THREE.DoubleSide
            });
            
            // Create geometry for this segment
            const segmentGeometry = new THREE.PlaneGeometry(segmentWidth, this.height);
            // UV Mapping for panoramic effect:
            // Each segment represents 1 / wallSegmentsCount of the circumference.
            // If we have 4 images, each image should cover wallSegmentsCount / 4 segments.
            // We need to adjust the UVs for each segment so that it displays the correct
            // horizontal slice of its assigned texture.
            const uvs = segmentGeometry.attributes.uv.array;
            const segmentsPerImage = this.wallSegmentsCount / numPanoramicImages;
            
            // Calculate which part of the current image this segment represents (0 to 1)
            const segmentWithinImage = (i % segmentsPerImage) / segmentsPerImage;
            const nextSegmentWithinImage = ((i % segmentsPerImage) + 1) / segmentsPerImage;
            // Default UVs are (0,1), (1,1), (0,0), (1,0) for TL, TR, BL, BR corners of a plane
            // We need to map these to a slice of the texture
            // uvs[0] = u for Top-Left, uvs[1] = v for Top-Left
            // uvs[2] = u for Top-Right, uvs[3] = v for Top-Right
            // uvs[4] = u for Bottom-Left, uvs[5] = v for Bottom-Left
            // uvs[6] = u for Bottom-Right, uvs[7] = v for Bottom-Right
            // Horizontal UV mapping (u-coordinate)
            // segmentWithinImage and nextSegmentWithinImage range from 0 to 1 across the 90-degree arc for the current texture.
            if (textureIndex === 0) { // Front-right quadrant (0 to PI/2). Should show LEFT half of Wall1.png (SMOKE graffiti), NOT flipped.
                const uStartTexture = 0.0; 
                const uEndTexture = 0.5;   
                // Map segmentWithinImage [0,1] to texture U range [uStartTexture, uEndTexture] (NOT flipped)
                uvs[0] = uStartTexture + segmentWithinImage * (uEndTexture - uStartTexture);
                uvs[2] = uStartTexture + nextSegmentWithinImage * (uEndTexture - uStartTexture);
                uvs[4] = uvs[0]; // Same U for bottom
                uvs[6] = uvs[2]; // Same U for bottom
            } else if (textureIndex === 1) { // Front-left quadrant (PI/2 to PI). Should show RIGHT half of Wall1.png (VAPE outline), NOT flipped.
                const uStartTexture = 0.5; 
                const uEndTexture = 1.0; 
                // Map segmentWithinImage [0,1] to texture U range [uStartTexture, uEndTexture] (NOT flipped)
                uvs[0] = uStartTexture + segmentWithinImage * (uEndTexture - uStartTexture);
                uvs[2] = uStartTexture + nextSegmentWithinImage * (uEndTexture - uStartTexture);
                uvs[4] = uvs[0];
                uvs[6] = uvs[2];
            } else {
                // Default mapping for other textures (Wall2, Wall3)
                uvs[0] = segmentWithinImage;
                uvs[2] = nextSegmentWithinImage;
                uvs[4] = segmentWithinImage;
                uvs[6] = nextSegmentWithinImage;
            }
            
            // Vertical UV mapping (v-coordinate) is default (0 to 1)
            // Apply 4-pixel downward offset for Wall1.png (textureIndex 0 or 1)
            if (textureIndex === 0 || textureIndex === 1) {
                const wall1TextureHeight = 1024; // Height of Wall1.png in pixels
                const pixelOffset = 4; // Maintaining the 4px offset
                const vOffset = pixelOffset / wall1TextureHeight;
                uvs[1] -= vOffset; // Top-Left v
                uvs[3] -= vOffset; // Top-Right v
                uvs[5] -= vOffset; // Bottom-Left v
                uvs[7] -= vOffset; // Bottom-Right v
            }
            
            segmentGeometry.attributes.uv.needsUpdate = true;
            const wallSegment = new THREE.Mesh(segmentGeometry, wallMaterial);
            // Position the segment
            // We want the center of the flat plane to be on the circumference
            const x = this.radius * Math.cos(angle + segmentAngle / 2); // Position at midpoint of segment's arc
            const z = this.radius * Math.sin(angle + segmentAngle / 2);
            wallSegment.position.set(x, this.height / 2, z);
            // Rotate the segment to face the center of the showroom
            wallSegment.lookAt(new THREE.Vector3(0, this.height / 2, 0));
            wallSegment.castShadow = true;
            wallSegment.receiveShadow = true;
            this.scene.add(wallSegment);
            this.wallSegments.push(wallSegment);
        }
    }
}