import * as THREE from 'three';
export function createDomeCeiling(scene, radius, domeBaseY, segments, textureLoaderInstance) {
    const textureLoader = textureLoaderInstance || new THREE.TextureLoader();
    // Create a sphere geometry for the dome (top half of a sphere)
    // phiStart, phiLength define horizontal sweep (0 to 2PI for full circle)
    // thetaStart, thetaLength define vertical sweep (0 to PI/2 for top hemisphere)
    const domeGeometry = new THREE.SphereGeometry(
        radius, // Sphere radius
        segments, // Width segments
        Math.max(16, Math.floor(segments / 2)), // Height segments, ensure a reasonable minimum
        0, // phiStart
        Math.PI * 2, // phiLength
        0, // thetaStart (top pole)
        Math.PI / 2 
    );
    // const textureLoader = new THREE.TextureLoader(); // Use passed instance
    const ceilingTexture = textureLoader.load('https://play.rosebud.ai/assets/Ceiling.png?rw9e');
    ceilingTexture.colorSpace = THREE.SRGBColorSpace; 
    // For a dome, ClampToEdge might be okay, or Repeat/MirroredRepeat for S if texture is tileable.
    // Let's start with ClampToEdge and see how it looks.
    ceilingTexture.wrapS = THREE.ClampToEdgeWrapping;
    ceilingTexture.wrapT = THREE.ClampToEdgeWrapping;
    // texture.repeat.set(2, 1); // Optional: stretch/tile texture if needed
    const domeMaterial = new THREE.MeshStandardMaterial({
        map: ceilingTexture,
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.9,
        side: THREE.BackSide // Visible from inside the dome
    });
    const domeMesh = new THREE.Mesh(domeGeometry, domeMaterial);
    domeMesh.position.y = domeBaseY; // Position the base of the dome (center of sphere geometry)
    // Dome doesn't need to cast shadows typically, but can receive them if there's anything above.
    domeMesh.castShadow = false;
    domeMesh.receiveShadow = true;
    scene.add(domeMesh);
    return domeMesh;
}
// This function creates the ceiling spotlights and their visible fixtures (light meshes).
// 'lightsYPosition' is the Y level where the light fixtures are placed.
export function createCeilingLights(scene, showroomRadius, lightsYPosition, numLights = 8) {
    const lightMeshes = [];
    const spotlights = [];
    const lightRadius = 0.3; // Radius of each light fixture mesh
    const lightDistanceFromCenter = showroomRadius * 0.7;
    const lightColor = 0xffffee;
    const spotLightColor = 0xfff5e0;
    for (let i = 0; i < numLights; i++) {
        const angle = (i / numLights) * Math.PI * 2;
        const x = Math.cos(angle) * lightDistanceFromCenter;
        const z = Math.sin(angle) * lightDistanceFromCenter;
        // Light fixture mesh (the emissive circle)
        const lightMeshY = lightsYPosition - 0.05; // Slightly below the transparent plane for visibility
        const lightGeometry = new THREE.CircleGeometry(lightRadius, 32);
        const lightMaterial = new THREE.MeshStandardMaterial({
            color: lightColor,
            emissive: lightColor,
            emissiveIntensity: 1.5,
            side: THREE.DoubleSide,
            metalness: 0,
            roughness: 0.5
        });
        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.position.set(x, lightMeshY, z);
        lightMesh.rotation.x = Math.PI / 2; // Face down
        lightMesh.castShadow = false;
        lightMesh.receiveShadow = false;
        // scene.add(lightMesh); // <-- We simply comment this out or remove it
        lightMeshes.push(lightMesh); // We can still keep track of them if needed for some other logic
        // Actual SpotLight
        const spotLight = new THREE.SpotLight(
            spotLightColor,
            5, // intensity
            lightsYPosition * 2, // distance (ensure it reaches floor well)
            Math.PI / 6, // angle
            0.25, // penumbra
            1 // decay
        );
        spotLight.position.set(x, lightsYPosition - 0.1, z); // Position light just below the fixture mesh
        spotLight.target.position.set(x, 0, z); // Target the floor directly below
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 512;
        spotLight.shadow.mapSize.height = 512;
        spotLight.shadow.camera.near = 0.5;
        spotLight.shadow.camera.far = lightsYPosition * 2.2; // Adjust far plane based on light height
        spotLight.shadow.focus = 1;
        scene.add(spotLight);
        scene.add(spotLight.target);
        spotlights.push(spotLight);
    }
    return { lightMeshes, spotlights };
}