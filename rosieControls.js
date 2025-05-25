import * as THREE from 'three';

/**
 * PlayerController - Handles player movement and physics
 */
class PlayerController {
  constructor(player, options = {}) {
    this.player = player;

    // Configuration
    this.moveSpeed = options.moveSpeed || 10;
    this.jumpForce = options.jumpForce || 15;
    this.gravity = options.gravity || 30;
    this.groundLevel = options.groundLevel || 1;

    // State
    this.velocity = new THREE.Vector3();
    this.isOnGround = true;
    this.canJump = true;
    this.keys = {};
    this.cameraMode = 'third-person';
    this.joystickInput = { x: 0, y: 0 }; // Add joystick input state

    // Setup input handlers
    this.setupInput();
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  // Add method to update joystick input
  setJoystickInput(x, y) {
    this.joystickInput.x = x;
    this.joystickInput.y = y;
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  update(deltaTime, cameraRotation) {
    if (this.player.position.y > this.groundLevel) {
      this.velocity.y -= this.gravity * deltaTime;
      this.isOnGround = false;
    } else {
      this.velocity.y = Math.max(0, this.velocity.y);
      this.player.position.y = this.groundLevel;
      this.isOnGround = true;
      this.canJump = true;
    }

    if (this.keys['Space'] && this.isOnGround && this.canJump) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
      this.canJump = false;
    }

    let moveX = 0;
    let moveZ = 0;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation);
    const currentMoveSpeed = this.moveSpeed;

    // Handle keyboard input
    if (this.keys['KeyW']) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys['KeyS']) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys['KeyA']) {
      moveX -= right.x;
      moveZ -= right.z;
    }
    if (this.keys['KeyD']) {
      moveX += right.x;
      moveZ += right.z;
    }

    // Handle joystick input
    if (this.joystickInput.y !== 0 || this.joystickInput.x !== 0) {
      moveX += forward.x * this.joystickInput.y + right.x * this.joystickInput.x;
      moveZ += forward.z * this.joystickInput.y + right.z * this.joystickInput.x;
    }

    const moveDirection = new THREE.Vector3(moveX, 0, moveZ);
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
    }

    this.velocity.x = moveDirection.x * currentMoveSpeed;
    this.velocity.z = moveDirection.z * currentMoveSpeed;

    this.player.position.x += this.velocity.x * deltaTime;
    this.player.position.y += this.velocity.y * deltaTime;
    this.player.position.z += this.velocity.z * deltaTime;

    if (this.cameraMode === 'third-person' && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.player.rotation.y = angle + Math.PI;
    }
  }
}

/**
 * FirstPersonCameraController - Handles first-person camera controls
 */
class FirstPersonCameraController {
  constructor(camera, player, domElement, options = {}) {
    this.camera = camera;
    this.player = player;
    this.domElement = domElement;

    this.eyeHeight = options.eyeHeight || 1.6;
    this.mouseSensitivity = options.mouseSensitivity || 0.002;

    this.enabled = false;
    this.rotationY = 0;
    this.rotationX = 0;

    this.setupMouseControls();
  }

  setupMouseControls() {
    this.boundRequestPointerLock = this.requestPointerLock.bind(this);
    this.domElement.addEventListener('click', this.boundRequestPointerLock);
    this.boundMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.boundMouseMove);
  }

  onMouseMove(e) {
    if (!this.enabled || document.pointerLockElement !== this.domElement) return;
    this.rotationY -= e.movementX * this.mouseSensitivity;
    this.rotationX -= e.movementY * this.mouseSensitivity;
    this.rotationX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.rotationX));
  }

  enable() {
    this.enabled = true;
    this.hidePlayer();
  }

  disable() {
    this.enabled = false;
    this.showPlayer();
  }

  hidePlayer() {
    this.originalVisibility = [];
    this.player.traverse(child => {
      if (child.isMesh) {
        this.originalVisibility.push({
          object: child,
          visible: child.visible
        });
        child.visible = false;
      }
    });
  }

  showPlayer() {
    if (this.originalVisibility) {
      this.originalVisibility.forEach(item => {
        item.object.visible = item.visible;
      });
      this.originalVisibility = null;
    }
  }

  requestPointerLock() {
    if (this.enabled && document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock();
    }
  }

  disablePointerLock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  update() {
    if (!this.enabled) return 0;

    this.player.rotation.y = this.rotationY;

    this.camera.position.x = this.player.position.x;
    this.camera.position.y = this.player.position.y + this.eyeHeight;
    this.camera.position.z = this.player.position.z;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.rotationX;
    this.camera.rotation.y = this.rotationY;

    return this.rotationY;
  }
}

export { PlayerController, FirstPersonCameraController };