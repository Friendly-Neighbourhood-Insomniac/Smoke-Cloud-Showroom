import * as THREE from 'three';

const DEFAULT_PARTICLE_COUNT = 50;
const DEFAULT_AREA_RADIUS = 0.5;
const DEFAULT_PARTICLE_BASE_SIZE = 0.1;
const DEFAULT_MAX_LIFE = 3; // seconds
const DEFAULT_EMISSION_Y_OFFSET = -0.1; // Relative to basePosition
const PARTICLE_COLOR = new THREE.Color(0xcccccc);
const UPWARD_SPEED = 0.06; // Reduced by 20% from 0.075
const SPREAD_SPEED = 0.05;

export class FogParticleSystem {
    constructor(scene, basePosition, options = {}) {
        this.scene = scene;
        this.basePosition = basePosition.clone();

        this.particleCount = options.particleCount || DEFAULT_PARTICLE_COUNT;
        this.areaRadius = options.areaRadius || DEFAULT_AREA_RADIUS;
        this.particleBaseSize = options.particleBaseSize || DEFAULT_PARTICLE_BASE_SIZE;
        this.maxLife = options.maxLife || DEFAULT_MAX_LIFE;
        this.emissionYOffset = options.emissionYOffset !== undefined ? options.emissionYOffset : DEFAULT_EMISSION_Y_OFFSET;

        this.particles = [];
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        const alphas = new Float32Array(this.particleCount); // For conceptual alpha, will influence size

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: this.maxLife * (0.75 + Math.random() * 0.5), // Vary max life
                baseSize: this.particleBaseSize * (0.5 + Math.random() * 1.0), // Vary base size
            });
            this._initParticle(i); // Initialize all attributes
            // Set initial buffer values (will be updated in first _initParticle call)
            positions[i * 3] = this.particles[i].position.x;
            positions[i * 3 + 1] = this.particles[i].position.y;
            positions[i * 3 + 2] = this.particles[i].position.z;

            PARTICLE_COLOR.toArray(colors, i * 3);
            sizes[i] = 0; // Start small / invisible
            alphas[i] = 0;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        // Alpha is tricky with PointsMaterial without texture/custom shader, we'll fake it with size
        const textureLoader = new THREE.TextureLoader();
        const smokeTexture = textureLoader.load('https://play.rosebud.ai/assets/smoke.png?dHGB');
        this.material = new THREE.PointsMaterial({
            map: smokeTexture,
            vertexColors: true, 
            sizeAttenuation: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            opacity: 0.36, // Increased transparency by another 20% (0.45 * 0.8 = 0.36)
            // For PointsMaterial, opacity is a single value for all points.
            // We'll manage individual particle fade via their size and the overall material opacity
            // for the whole system if needed. For now, focus on size-based fade.
            alphaTest: 0.01 // Helps with harsh edges on smoke textures
        });
        
        this.points = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.points);
    }

    _initParticle(index) {
        const p = this.particles[index];

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.areaRadius;

        p.position.set(
            this.basePosition.x + Math.cos(angle) * radius,
            this.basePosition.y + this.emissionYOffset,
            this.basePosition.z + Math.sin(angle) * radius
        );

        p.velocity.set(
            (Math.random() - 0.5) * SPREAD_SPEED,
            UPWARD_SPEED * (0.8 + Math.random() * 0.4), // Vary upward speed
            (Math.random() - 0.5) * SPREAD_SPEED
        );
        
        p.life = p.maxLife * Math.random(); // Start particles at random points in their life
        // Buffers for position, color, size are updated in the update loop
    }

    update(deltaTime) {
        const positionAttribute = this.geometry.attributes.position;
        const sizeAttribute = this.geometry.attributes.size;

        for (let i = 0; i < this.particleCount; i++) {
            const p = this.particles[i];
            p.life -= deltaTime;

            if (p.life <= 0) {
                this._initParticle(i); // Reinitialize position, velocity, life
                // Reset life to full maxLife for a fresh start
                p.life = p.maxLife;
            }

            p.position.addScaledVector(p.velocity, deltaTime);

            positionAttribute.setXYZ(i, p.position.x, p.position.y, p.position.z);
            
            const lifeRatio = Math.max(0, p.life / p.maxLife); // 1 when new, 0 when dead
            // Size and Opacity curve for smoke:
            // Smoke typically expands and then fades.
            // We'll use size for expansion and then fade using material opacity (though PointsMaterial has one opacity)
            // For per-particle alpha, a custom shader is usually needed.
            // Here, we'll simulate fade-out primarily with size, and overall system opacity if desired later.
            let scaleFactor;
            const peakExpansionTime = 0.3; // Time (ratio of maxLife) at which particle is largest
            const fadeStartTime = 0.4; // Time (ratio of maxLife) at which particle starts to fade significantly
            if (lifeRatio > (1 - peakExpansionTime)) { // Initial expansion phase (e.g., from 1.0 down to 0.7 lifeRatio)
                // Ramps from 0 to 1 as lifeRatio goes from 1.0 to (1-peakExpansionTime)
                const expansionProgress = (1.0 - lifeRatio) / peakExpansionTime;
                scaleFactor = expansionProgress; // Linear expansion
            } else if (lifeRatio > fadeStartTime) { // Stable, large phase (e.g., from 0.7 down to 0.4 lifeRatio)
                scaleFactor = 1.0; // Fully expanded
            } else { // Fade out phase (e.g., from 0.4 down to 0.0 lifeRatio)
                // Ramps from 1 to 0 as lifeRatio goes from fadeStartTime to 0
                scaleFactor = lifeRatio / fadeStartTime;
            }
            // Apply a non-linear curve to scaleFactor for a more natural look (e.g., easeOutQuad for fade)
            scaleFactor = scaleFactor * (2 - scaleFactor); // Smoothstep-like curve for expansion
            if (lifeRatio <= fadeStartTime) {
                 scaleFactor = scaleFactor * scaleFactor; // Quad-out for fade
            }
            const currentSize = p.baseSize * scaleFactor * 1.5; // Multiply by 1.5 or similar to make smoke puffs larger
            sizeAttribute.setX(i, Math.max(0, currentSize));
            // Note: PointsMaterial.opacity affects ALL particles.
            // To make individual particles fade, we typically rely on shrinking their size to zero.
            // If an overall system fade is desired, this.material.opacity could be animated.
        }

        positionAttribute.needsUpdate = true;
        sizeAttribute.needsUpdate = true;
        // Color attribute is static for now, but could be updated too
    }

    dispose() {
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}