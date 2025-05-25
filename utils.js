// Device detection utilities
export function isMobileDevice() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone|opera mini|silk/i.test(ua);
  const touchEnabled = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const smallScreen = window.innerWidth <= 768;
  
  return isMobile || (touchEnabled && smallScreen);
}

// Touch controls utilities
export function getTouchPosition(event, element) {
  const rect = element.getBoundingClientRect();
  const touch = event.touches[0] || event.changedTouches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

// Virtual joystick utilities
export class VirtualJoystick {
  constructor(container, options = {}) {
    this.container = container;
    this.size = options.size || 120;
    this.maxDistance = options.maxDistance || 50;
    this.deadzone = options.deadzone || 0.2;
    
    this.position = { x: 0, y: 0 };
    this.delta = { x: 0, y: 0 };
    this.active = false;
    this.startPosition = { x: 0, y: 0 };
    
    this.setupElements();
    this.setupEvents();
  }

  setupElements() {
    // Create joystick container
    this.element = document.createElement('div');
    this.element.className = 'virtual-joystick';
    this.element.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: ${this.size}px;
      height: ${this.size}px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      touch-action: none;
      display: none;
    `;

    // Create joystick knob
    this.knob = document.createElement('div');
    this.knob.className = 'virtual-joystick-knob';
    this.knob.style.cssText = `
      position: absolute;
      width: ${this.size * 0.4}px;
      height: ${this.size * 0.4}px;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      will-change: transform;
    `;

    this.element.appendChild(this.knob);
    this.container.appendChild(this.element);
  }

  setupEvents() {
    this.element.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.element.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.element.addEventListener('touchend', () => this.onTouchEnd());
  }

  onTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.element.getBoundingClientRect();
    this.active = true;
    this.startPosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  onTouchMove(event) {
    if (!this.active) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    const rect = this.element.getBoundingClientRect();
    
    this.position = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    this.delta = {
      x: this.position.x - this.startPosition.x,
      y: this.position.y - this.startPosition.y
    };

    const distance = Math.sqrt(this.delta.x ** 2 + this.delta.y ** 2);
    if (distance > this.maxDistance) {
      const angle = Math.atan2(this.delta.y, this.delta.x);
      this.delta.x = Math.cos(angle) * this.maxDistance;
      this.delta.y = Math.sin(angle) * this.maxDistance;
    }

    this.knob.style.transform = `translate(${this.delta.x}px, ${this.delta.y}px)`;
  }

  onTouchEnd() {
    this.active = false;
    this.delta = { x: 0, y: 0 };
    this.knob.style.transform = 'translate(-50%, -50%)';
  }

  getInput() {
    if (!this.active || Math.abs(this.delta.x) < this.deadzone && Math.abs(this.delta.y) < this.deadzone) {
      return { x: 0, y: 0 };
    }

    return {
      x: this.delta.x / this.maxDistance,
      y: -this.delta.y / this.maxDistance // Invert Y for game coordinates
    };
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }
}