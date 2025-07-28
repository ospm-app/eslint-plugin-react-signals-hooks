// oxlint-disable no-unused-vars
/** biome-ignore-all lint/correctness/noUnusedVariables:not relevant */
import * as THREE from 'three';

// Test case 1: Direct property updates in animation loop (should warn)
export function testDirectPropertyUpdates() {
  const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());

  // This would be in an animation loop (should be optimized)
  function animate() {
    cube.position.x += 0.01; // Direct property update in loop
    cube.rotation.y += 0.01; // Direct property update in loop
  }

  return { cube, animate };
}

// Test case 2: Inefficient transformations (should warn)
export function testInefficientTransformations() {
  const group = new THREE.Group();

  // Inefficient way to position many objects
  for (let i = 0; i < 100; i++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    cube.position.set(i, 0, 0); // Individual position updates
    group.add(cube);
  }

  return group;
}

// Test case 3: CPU-based particle system (should warn)
export function testCpuParticleSystem() {
  const particles = new THREE.Group();
  const geometry = new THREE.BufferGeometry();

  // CPU-based particle positions
  const positions = [];
  for (let i = 0; i < 1000; i++) {
    positions.push(
      Math.random() * 2000 - 1000,
      Math.random() * 2000 - 1000,
      Math.random() * 2000 - 1000
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const particlesMesh = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x00ff00 }));

  // This would be in an animation loop (inefficient)
  function animate() {
    const positions = particlesMesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += 0.1; // Update Y position on CPU
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;
  }

  return { particles: particlesMesh, animate };
}

// Test case 4: Non-optimized animation mixer (should warn)
export function testNonOptimizedAnimationMixer() {
  const mixer = new THREE.AnimationMixer(new THREE.Object3D());
  const clock = new THREE.Clock();

  // This would be in an animation loop (inefficient)
  function animate() {
    const delta = clock.getDelta();
    mixer.update(delta); // No check for active animations
  }

  return { mixer, animate };
}

// Test case 5: GPU-optimized animation (should pass)
export function testGpuOptimizedAnimation() {
  // Using shader material for GPU-based animation
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      uniform float time;
      void main() {
        vec3 transformed = position;
        transformed.y += sin(time + position.x * 2.0) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // This would be in an animation loop (efficient)
  function animate() {
    material.uniforms.time.value += 0.01;
  }

  return { mesh, animate };
}

// Test case 6: Instanced mesh for particles (should pass)
export function testInstancedParticles() {
  const count = 1000;
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const material = new THREE.MeshStandardMaterial();

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  // Set initial positions
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.setPosition(
      Math.random() * 100 - 50,
      Math.random() * 100 - 50,
      Math.random() * 100 - 50
    );
    mesh.setMatrixAt(i, matrix);
  }

  return mesh;
}

// Test case 7: Using morph targets (should pass)
export function testMorphTargets() {
  // Create geometry with morph targets
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const basePosition = geometry.attributes.position.clone();

  // Create morph target
  const morphPosition = new Float32Array(basePosition.count * 3);
  for (let i = 0; i < morphPosition.length; i++) {
    morphPosition[i] = basePosition.array[i] * (1 + Math.random() * 0.5);
  }

  geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(morphPosition, 3)];

  const material = new THREE.MeshBasicMaterial({
    // Should warn, morphTargets is not available on MeshBasicMaterial parameters
    // @ts-expect-error The error occurs because the morphTargets property isn't directly available in the MeshBasicMaterial constructor options in the current Three.js type definitions. Instead, you should set it on the material instance after creation.
    morphTargets: true,
    color: 0x00ff00,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // This would be in an animation loop (efficient)
  function animate() {
    if (!mesh.morphTargetInfluences) {
      return;
    }

    mesh.morphTargetInfluences[0] = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
  }

  return { mesh, animate };
}

// Test case 8: Using shader for complex animations (should pass)
export function testShaderAnimation() {
  const geometry = new THREE.PlaneGeometry(10, 10, 32, 32);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float d = length(uv);
        float c = smoothstep(0.3, 0.5, sin(d * 10.0 - time * 5.0) * 0.5 + 0.5);
        gl_FragColor = vec4(vec3(c), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // This would be in an animation loop (efficient)
  function animate() {
    material.uniforms.time.value += 0.01;
  }

  return { mesh, animate };
}

// Test case 9: Using instanced buffer attributes (should pass)
export function testInstancedBufferAttributes() {
  const count = 1000;
  const geometry = new THREE.InstancedBufferGeometry();

  // Base geometry (a simple quad)
  const baseGeometry = new THREE.PlaneGeometry(1, 1);
  geometry.index = baseGeometry.index;
  geometry.attributes.position = baseGeometry.attributes.position;
  geometry.attributes.uv = baseGeometry.attributes.uv;

  // Per-instance data
  const offsets = [];
  const colors = [];

  for (let i = 0; i < count; i++) {
    // Position
    offsets.push(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50);

    // Color
    colors.push(Math.random(), Math.random(), Math.random());
  }

  geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
  geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 offset;
      attribute vec3 color;
      varying vec3 vColor;

      void main() {
        vColor = color;
        vec3 pos = position + offset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
  });

  return new THREE.Mesh(geometry, material);
}

// Test case 10: Using compute shaders (should pass)
export function testComputeShader() {
  // This would use a compute shader for GPU-based computations
  // Note: This is a simplified example - actual implementation would be more complex

  // In a real implementation, you would:
  // 1. Create a WebGLRenderTarget for compute results
  // 2. Set up a shader pass that performs the computation
  // 3. Use the results in your main rendering

  return 'This would use a compute shader for GPU-accelerated computations';
}
