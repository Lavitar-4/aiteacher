import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AnimationParams } from "./animations";
import { PhysicsSDK } from "./PhysicsSDK";

export class ThreeAnimator {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private resizeObserver: ResizeObserver;
  private rafId: number | null = null;
  private startTime: number = 0;
  private lastTime: number = 0;
  private physicsWorld: CANNON.World | null = null;
  private sdk: PhysicsSDK | null = null;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // Initialize with current container size
    const width = this.container.clientWidth || 380;
    const height = this.container.clientHeight || 500;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Handle container resize
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.renderer.setSize(width, height);
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
        }
      }
    });
    this.resizeObserver.observe(this.container);

    this._addDefaultLights();
  }

  private _addDefaultLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);
  }

  public start(params: AnimationParams = {}, onError?: (err: Error) => void) {
    this.stop();

    // Reset scene
    this.scene.clear();
    this._addDefaultLights();

    // Reset physics
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    this.sdk = new PhysicsSDK(this.scene, this.physicsWorld);

    if (!params.code || typeof params.code !== "string") return;

    // _ctx is a persistent object passed to AI code every frame.
    // AI code stores its meshes here (e.g. _ctx.planet = new THREE.Mesh(...))
    // This is MUCH more reliable than window.* globals or if(t===0) tricks.
    const _ctx: Record<string, any> = {};

    // Compile once
    let runCustom: Function;
    try {
      runCustom = new Function(
        "THREE", "CANNON", "PhysicsSDK", "scene", "world", "sdk", "camera", "renderer", "t", "S", "_ctx",
        params.code as string
      );
    } catch (e: any) {
      console.error("[ThreeAnimator] Compile error:", e);
      if (onError) onError(e);
      return;
    }

    // Run init frame synchronously with t=0 to populate _ctx
    try {
      const S = params.liveSliders || {};
      runCustom(THREE, CANNON, PhysicsSDK, this.scene, this.physicsWorld, this.sdk, this.camera, this.renderer, 0, S, _ctx);
    } catch (e: any) {
      console.error("[ThreeAnimator] Init frame error:", e);
      if (onError) onError(e);
      return;
    }

    this.startTime = performance.now();
    this.lastTime = this.startTime;

    const animate = (now: number) => {
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const t = (now - this.startTime) / 1000;

      // Step physics
      if (this.physicsWorld) {
        this.physicsWorld.step(1 / 60, dt, 3);
      }
      if (this.sdk) {
        this.sdk.update();
      }

      try {
        const S = params.liveSliders || {};
        runCustom(THREE, CANNON, PhysicsSDK, this.scene, this.physicsWorld, this.sdk, this.camera, this.renderer, t, S, _ctx);
      } catch (e: any) {
        console.warn("[ThreeAnimator] Frame error:", e);
        if (onError) onError(e);
        this.stop();
        return;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  public stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.sdk) {
      this.sdk.clear();
      this.sdk = null;
    }
    this.physicsWorld = null;
  }

  public destroy() {
    this.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
