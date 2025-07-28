# TODO @ospm/eslint-plugin-threejs

## Deprecated Patterns Rules

These rules aim to prevent usage of features that have been deprecated or removed in recent Three.js versions (e.g., from r125 onward, based on the official migration guide and release notes). Using them can lead to code breakage during library upgrades, runtime errors, or suboptimal behavior. ESLint can detect these via AST parsing for specific class instantiations, method calls, or imports.

1. **no-deprecated-geometry-class**  
   - Detect and ban instantiation of `THREE.Geometry`.  
   - *Why?* This class was deprecated in favor of `THREE.BufferGeometry` for better performance and WebGL compatibility. It was fully removed in r125, and continuing to use it prevents leveraging modern GPU-accelerated rendering, leading to slower vertex handling and potential crashes on update.

2. **no-deprecated-tsl-blending-functions**  
   - Flag uses of old TSL (Three.js Shader Language) blending methods like `burn()`, `dodge()`, `screen()`, and `overlay()`. Suggest replacements like `blendBurn()`, `blendDodge()`, etc.  
   - *Why?* These were renamed in recent releases to avoid naming conflicts and improve clarity. Deprecated calls will throw warnings or errors in future versions, disrupting shader-based effects and materials.

3. **no-deprecated-gamma-factor**  
   - Warn on setting `renderer.gammaFactor`.  
   - *Why?* Gamma correction was overhauled in the color management system (around r110+). This property is deprecated and ignored in newer versions, leading to inconsistent colors across devices and potential visual artifacts without proper migration to `renderer.outputColorSpace`.

4. **no-legacy-examples-imports**  
   - Detect imports from the deprecated `/examples/js` directory (e.g., old `OrbitControls` or `GLTFLoader` paths).  
   - *Why?* The `/examples/js` folder was removed in r148, shifting to modular `/examples/jsm`. Using old paths causes import failures, blocking access to updated addons with bug fixes and performance improvements.

5. **no-deprecated-build-files**  
   - Flag direct references to `build/three.js` or `build/three.min.js` in scripts or imports.  
   - *Why?* These monolithic builds were deprecated in r150+ (to be removed by r160), favoring modular imports for tree-shaking and smaller bundle sizes. Relying on them bloats applications and hinders optimization tools like webpack.

### Performance Issues Rules

These rules target common pitfalls that degrade frame rates, increase draw calls, or waste resources, based on best practices from Three.js documentation, community forums, and performance guides. Static analysis can flag patterns like excessive object creation or inefficient API usage, though some may require configuration (e.g., thresholds) for project-specific tuning.

1. **limit-scene-lights**  
   - Warn if more than a configurable number (e.g., 4) of lights are added to a scene via `scene.add(light)`.  
   - *Why?* Each light increases shader complexity and draw calls, significantly impacting performance on mobile or low-end devices. Best practices recommend minimizing lights (use baked lighting or simpler types like ambient) to maintain 60 FPS, as excessive lights can halve render speeds.

2. **prefer-instanced-mesh**  
   - Detect loops creating multiple identical meshes without using `THREE.InstancedMesh`. Flag if a threshold (e.g., >10) of similar geometries/materials are instantiated separately.  
   - *Why?* Instancing renders thousands of objects in one draw call, reducing CPU/GPU overhead. Without it, scenes with repeated elements (e.g., particles or trees) suffer from high draw calls, leading to stuttering—especially critical for VR/AR or large-scale visualizations.

3. **enforce-texture-size-limits**  
   - Flag texture loads (e.g., via `THREE.TextureLoader`) where dimensions exceed 2048x2048, or suggest using texture atlases for multiple small textures.  
   - *Why?* High-resolution textures consume excessive VRAM and slow down loading/rendering, particularly on mobile. Best practices cap at 1024x1024 for most assets; exceeding this can cause memory leaks or dropped frames, as noted in optimization guides.

4. **no-triangle-fan-draw-mode**  
   - Ban use of `THREE.TriangleFanDrawMode` in geometries or materials.  
   - *Why?* This mode is inefficient on modern GPUs compared to `TriangleStrip` or default modes, leading to slower vertex processing. It's a known performance killer in complex scenes, as highlighted in Three.js tips for geometry optimization.

5. **prefer-gpu-animation**  
   - Warn on manual updates to object properties (e.g., `mesh.position.x += delta`) inside render loops, suggesting migration to shaders or uniforms.  
   - *Why?* CPU-based animations bottleneck the main thread, especially with many objects, causing jitter. GPU-driven alternatives (via vertex shaders) offload work, improving FPS by 2-3x in dynamic scenes like simulations or games.

6. **enforce-clipping-planes**  
   - Require explicit setting of `camera.near` and `camera.far` (warn if defaults are used or ranges are excessively wide, e.g., >10000 units).  
   - *Why?* Poor clipping planes lead to z-fighting, unnecessary rendering of distant objects, and depth buffer precision issues, degrading performance and visuals. Tight ranges (e.g., near=0.1, far=1000) are a core optimization tip for maintaining smooth rendering.

7. **optimize-pixel-ratio-mobile**  
   - Warn if `renderer.setPixelRatio(window.devicePixelRatio)` is used without conditional checks for mobile devices (e.g., via user-agent or media queries). Suggest capping at 1-1.5 on high-DPI screens.  
   - *Why?* Full device pixel ratio on mobiles quadruples rendering cost, tanking FPS on weak hardware. Strategic lowering (as per community tips) balances quality and performance, essential for responsive WebGL apps.

Implementing these as a custom ESLint plugin would involve parsing import statements, class instantiations, and method calls using tools like `@babel/parser`. For projects using React Three Fiber, rules could extend to hooks like `useFrame` for loop optimizations. Start with the deprecation rules for immediate impact, as they're easier to enforce and prevent breakage.

### Additional Deprecated Patterns Rules

Building on the previous set, here are more rules focused on recent deprecations (e.g., from Three.js r158+ based on release notes and community discussions). These help prevent reliance on outdated APIs that may cause compatibility issues or require major refactors during upgrades, especially with the shift toward WebGL2 and WebGPU.

1. **no-legacy-materials**  
   - Detect instantiation of `MeshLambertMaterial` or `MeshPhongMaterial`.  
   - *Why?* These materials are considered legacy and not recommended for new projects, as they lack physically-based rendering (PBR) features. Modern Three.js encourages `MeshStandardMaterial` or `MeshPhysicalMaterial` for better lighting realism and future compatibility, reducing visual inconsistencies and potential removal in upcoming releases.

2. **no-webgl1-support**  
   - Warn if `WebGLRenderer` is instantiated without checking `capabilities.isWebGL2`. Suggest adding a fallback or error message.  
   - *Why?* Support for WebGL1 was effectively dropped after r158, with the library focusing on WebGL2 and WebGPU for better performance and features. Using it on unsupported devices leads to rendering failures or fallbacks to software rendering, causing poor user experience.

3. **no-deprecated-plane-geometry**  
   - Flag uses of `PlaneBufferGeometry` in ways that rely on old UV or normal behaviors (e.g., without updates post-r143).  
   - *Why?* Changes in r143 altered texture and lighting behaviors (e.g., darker appearances), leading to visual bugs if not migrated. This ensures consistent rendering across versions.

### Additional Performance Issues Rules

These extend the prior performance rules by targeting draw call reduction, memory efficiency, and rendering optimizations, drawn from best practices like merging assets, culling, and on-demand rendering. They help maintain 60 FPS, especially on low-end devices, by flagging inefficient patterns detectable in code.

8. **enforce-geometry-merging**  
   - Detect loops or arrays creating multiple meshes with the same material/geometry; suggest using `mergeGeometries` or `BufferGeometryUtils.mergeBufferGeometries`.  
   - *Why?* Separate meshes increase draw calls, bottlenecking the GPU. Merging reduces calls significantly (e.g., from hundreds to one), improving FPS in scenes with repeated elements like terrain or particles, as emphasized in optimization guides.

9. **enforce-frustum-culling**  
   - Warn if `object.frustumCulled` is set to `false` on non-essential objects (e.g., via a configurable allowlist).  
   - *Why?* Disabling culling renders off-screen objects unnecessarily, wasting GPU cycles. Enabling it by default culls invisible items, boosting performance in large scenes (e.g., open worlds), a key tip for resilient apps across devices.

10. **prefer-render-on-demand**  

- Flag unconditional `renderer.render` calls in animation loops; suggest wrapping in conditions (e.g., if scene dirty or user input).  
- *Why?* Constant rendering drains battery and CPU in static or low-interaction scenes. On-demand rendering (e.g., via flags) can halve power usage while maintaining responsiveness, ideal for web apps and mobile.

11. **limit-shadow-casters**  

- Warn if more than a configurable number (e.g., 5) of objects have `castShadow` or `receiveShadow` enabled.  
- *Why?* Shadows multiply draw calls and shader complexity, often dropping FPS by 30-50% on mid-range hardware. Limiting them (or using baked shadows) aligns with best practices for smooth performance without sacrificing too much quality.

12. **enforce-material-reuse**  

- Detect creation of new materials inside loops or for similar objects; suggest sharing a single instance.  
- *Why?* Duplicate materials prevent batching and increase memory overhead. Reusing them enables GPU optimizations like instancing, reducing draw calls and improving render speeds in complex models.

### Memory Management Rules (Performance-Related)

Memory leaks can degrade performance over time (e.g., via GC pauses), so these rules safeguard against common pitfalls like undisposed resources, treating them as an extension of performance optimization.

1. **require-dispose-on-remove**  
   - Flag `scene.remove(object)` without a preceding or following `object.traverse((child) => { if (child.dispose) child.dispose(); })` or similar.  
   - *Why?* Un-disposed geometries, materials, or textures retain GPU memory, leading to leaks and slowdowns in long-running apps (e.g., games or editors). Proper disposal frees resources, preventing frame drops and crashes, a frequent issue in community forums.

2. **no-undisposed-loaders**  
   - Warn on loader usage (e.g., `GLTFLoader.load`) without disposing the loader instance after use.  
   - *Why?* Loaders hold references to parsed data, causing memory bloat if reused excessively. Disposing them post-load optimizes for apps with dynamic asset loading, maintaining stable performance.

These rules can be implemented in an ESLint plugin similarly to the previous ones, using AST to identify patterns. Prioritize memory rules for long-session apps, as they compound performance issues. If using frameworks like React Three Fiber, adapt for hooks (e.g., `useEffect` for dispose).
