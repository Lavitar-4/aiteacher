import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PhysicsSDK {
  scene: THREE.Scene;
  world: CANNON.World;
  physicsObjects: { mesh: THREE.Mesh; body: CANNON.Body }[];

  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.scene = scene;
    this.world = world;
    this.physicsObjects = [];
  }

  /**
   * Create a physical sphere and add it to the scene and physics world.
   */
  createSphere(radius: number, mass: number, color: number | string, position: { x: number, y: number, z: number }) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass, shape });
    body.position.set(position.x, position.y, position.z);
    this.world.addBody(body);
    
    this.physicsObjects.push({ mesh, body });
    return { mesh, body };
  }

  /**
   * Create a physical box and add it to the scene and physics world.
   */
  createBox(width: number, height: number, depth: number, mass: number, color: number | string, position: { x: number, y: number, z: number }) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({ mass, shape });
    body.position.set(position.x, position.y, position.z);
    this.world.addBody(body);
    
    this.physicsObjects.push({ mesh, body });
    return { mesh, body };
  }

  /**
   * Create a static floor plane for objects to land on.
   */
  createFloor(color: number | string = 0x223344) {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const shape = new CANNON.Plane();
    const body = new CANNON.Body({ mass: 0 }); // mass 0 = static
    body.addShape(shape);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(body);
    
    // We don't really need to push static bodies for position syncing, 
    // but we can for completeness.
    this.physicsObjects.push({ mesh, body });
    return { mesh, body };
  }

  /**
   * Call this every frame to sync Three.js meshes with Cannon.js bodies.
   */
  update() {
    for (const { mesh, body } of this.physicsObjects) {
      if (body.mass > 0) {
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
      }
    }
  }

  /**
   * Clear all SDK-created objects.
   */
  clear() {
    for (const { mesh, body } of this.physicsObjects) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
      this.world.removeBody(body);
    }
    this.physicsObjects = [];
  }
}
