import * as THREE from 'three';

// Placeholder for GLSL shaders (will be defined later)
const fogVertexShader = `
varying vec3 vWorldPosition; // To pass world position to fragment shader
varying vec3 vLocalPosition; // To pass local model position to fragment shader
void main() {
    // Transform the vertex position by the instance matrix first (specific to this instance)
    vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
    
    // Then transform by the model-view matrix (camera's view)
    vec4 modelViewPosition = modelViewMatrix * instancePosition;
    
    // Finally, transform by the projection matrix (to clip space)
    gl_Position = projectionMatrix * modelViewPosition;
    // Pass the world position of the vertex to the fragment shader
    // World position = model matrix (which is instanceMatrix here for instanced mesh) * local position
    vWorldPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
    vLocalPosition = position; // Pass the original local position
}
`;

const fogFragmentShader = `
varying vec3 vWorldPosition;
varying vec3 vLocalPosition; // Passed from vertex shader
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime; // Will be used for animation later
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uNoiseAnimationSpeed;
// GLSL Simplex Noise function by Stefan Gustavson
// https://github.com/stegu/webgl-noise/blob/master/src/simplex3d.glsl
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}
vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472090949 * r;
}
float snoise(vec3 v)
{
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; 
  vec3 x3 = x0 - D.yyy;      
// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
// Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
void main() {
    // Calculate distance from the center axis of the cylinder (XZ plane)
    float distToCenter = length(vLocalPosition.xz);
    
    // Normalized height (0 at bottom, 1 at top of cylinder)
    // vLocalPosition.y ranges from 0 to uCylinderHeight
    float normalizedHeight = vLocalPosition.y / uCylinderHeight;
    
    // Basic density falloff: denser in middle, fades at edges
    float radialDensity = 1.0 - smoothstep(0.0, 1.0, distToCenter);
    // Vertical density: 0 at bottom, 1 at mid-height, 0 at top
    float verticalDensity = 1.0 - abs(normalizedHeight - 0.5) * 2.0;
    verticalDensity = smoothstep(0.0, 1.0, verticalDensity);
    
    // Combine base densities
    float baseDensity = radialDensity * verticalDensity * uFogDensity;
    // Noise calculation
    vec3 noiseCoord = vWorldPosition * uNoiseScale;
    noiseCoord.y += uTime * uNoiseAnimationSpeed * 0.2; // Animate noise vertically
    noiseCoord.x += uTime * uNoiseAnimationSpeed * 0.1; // Animate noise horizontally
    float noiseValue = snoise(noiseCoord); // Simplex noise value in [-1, 1]
    noiseValue = (noiseValue * 0.5) + 0.5; // Map to [0, 1]
    // Modulate density with noise
    // If noiseStrength is 0.5, density can vary by +/- 50% of baseDensity based on noiseValue
    float noisyDensity = baseDensity * mix(1.0 - uNoiseStrength, 1.0 + uNoiseStrength, noiseValue);
    
    // Ensure alpha is within [0, 1] range
    float alpha = clamp(noisyDensity, 0.0, 1.0);
    gl_FragColor = vec4(uFogColor, alpha);
}
`;

export class VolumetricFog {
    constructor(scene, numInstances, fogOptions = {}) {
        this.scene = scene;
        this.numInstances = numInstances;
        this.fogOptions = {
            color: new THREE.Color(fogOptions.color || 0xbbbbbb), // Changed from 0x8888aa
            density: fogOptions.density || 0.35,                 // Reduced from 0.5
            height: fogOptions.height || 0.25,                   // Reduced from 0.5
            radius: fogOptions.radius || 0.75,                   // Radius of the fog cylinder
            noiseScale: fogOptions.noiseScale || 4.0,            // Increased from 3.5
            noiseStrength: fogOptions.noiseStrength || 0.3,
            noiseAnimationSpeed: fogOptions.noiseAnimationSpeed || 0.1
        };
        this.init();
    }

    init() {
        // Geometry for a single fog volume (e.g., a short cylinder)
        // Will be refined in the next steps
        const fogGeometry = new THREE.CylinderGeometry(
            this.fogOptions.radius, // radiusTop
            this.fogOptions.radius, // radiusBottom
            this.fogOptions.height, // height
            32,                     // radialSegments
            16,                     // heightSegments (Increased from 8 for smoother vertical profile)
            false                    // openEnded - false to have caps, which might look better initially
        );
        // Adjust geometry so its local origin (0,0,0) is at its base
        // This makes positioning logic more intuitive.
        // The cylinder is originally centered, so translate it up by half its height.
        fogGeometry.translate(0, this.fogOptions.height / 2, 0);
        // Material using custom shaders
        const fogMaterial = new THREE.ShaderMaterial({
            vertexShader: fogVertexShader,
            fragmentShader: fogFragmentShader,
            uniforms: {
                uTime: { value: 0.0 },
                uFogColor: { value: this.fogOptions.color },
                uFogDensity: { value: this.fogOptions.density },
                uCylinderHeight: { value: this.fogOptions.height },
                // uCylinderRadius: { value: this.fogOptions.radius }, // Removed as it's not used in shaders
                uNoiseScale: { value: this.fogOptions.noiseScale },
                uNoiseStrength: { value: this.fogOptions.noiseStrength },
                uNoiseAnimationSpeed: { value: this.fogOptions.noiseAnimationSpeed }
            },
            transparent: true,
            depthWrite: false, // Important for transparency
            side: THREE.DoubleSide, // Render both sides to see inside the volume from any angle
        });

        // InstancedMesh for efficiency
        this.instancedFog = new THREE.InstancedMesh(fogGeometry, fogMaterial, this.numInstances);
        this.instancedFog.castShadow = false;
        this.instancedFog.receiveShadow = false; // Fog generally doesn't receive shadows in a simple setup

        this.scene.add(this.instancedFog);

        // Instance positions will be set by updateInstanceTransform calls from game.js
    }
    updateInstanceTransform(index, position, scale = 1) {
        if (index >= this.numInstances) return;

        const matrix = new THREE.Matrix4();
        // Note: cylinder geometry origin is at its center. Adjust Y position accordingly.
        // Since geometry origin is at its base, yPosition is directly the desired base height.
        const yPosition = position.y; 
        matrix.compose(
            new THREE.Vector3(position.x, yPosition, position.z), // Position (base of fog cylinder)
            new THREE.Quaternion(),                                 // Rotation (none for now)
            new THREE.Vector3(scale, scale, scale)                  // Scale
        );
        this.instancedFog.setMatrixAt(index, matrix);
        this.instancedFog.instanceMatrix.needsUpdate = true;
    }
    
    update(deltaTime) {
        // Update uniforms, e.g., time for animation
        if (this.instancedFog.material.uniforms.uTime) {
            this.instancedFog.material.uniforms.uTime.value += deltaTime;
        }
    }

    dispose() {
        this.scene.remove(this.instancedFog);
        this.instancedFog.geometry.dispose();
        this.instancedFog.material.dispose();
    }
}