# TODO @ospm/eslint-plugin-react-three-fiber

## Existing Rules in @react-three/eslint-plugin

The official [@react-three/eslint-plugin](https://www.npmjs.com/package/@react-three/eslint-plugin) provides a set of rules tailored for React Three Fiber (R3F) to enforce performance best practices, particularly in hot paths like animation loops. It can be installed and extended in your ESLint config (e.g., `"extends": ["plugin:@react-three/recommended"]`).<grok:render card_id="cfbf2e" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">22</argument>
</grok:render> These rules detect patterns via AST analysis, focusing on operations inside `useFrame` or similar loops.

1. **no-clone-in-loop**  
   - Disallow cloning vectors or other Three.js objects (e.g., `vector.clone()`) inside frame loops.  
   - *Why?* Cloning creates temporary allocations that trigger garbage collection pauses, degrading frame rates in real-time rendering. Encourages reusing global temporaries (e.g., `tempVector.copy(original)`) for smoother performance in animations or simulations.<grok:render card_id="9abe29" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">22</argument>
</grok:render><grok:render card_id="012899" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">24</argument>
</grok:render>

2. **no-new-in-loop**  
   - Ban instantiating new objects (e.g., `new THREE.Vector3()`) within frame loops.  
   - *Why?* Repeated allocations in `useFrame` lead to memory churn and GC hits, slowing down GPU-bound scenes. Promotes pre-allocating objects outside loops, aligning with Three.js optimization guidelines for high-FPS apps.<grok:render card_id="e93cc8" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">22</argument>
</grok:render><grok:render card_id="aac105" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">24</argument>
</grok:render>

### Proposed Additional Performance Rules

These build on R3F's documented pitfalls and scaling tips, targeting React-specific inefficiencies like unnecessary re-renders or resource duplication. They could extend the existing plugin, using hooks detection (e.g., via `eslint-plugin-react-hooks`) and JSX parsing.<grok:render card_id="d3f620" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render><grok:render card_id="e93305" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">23</argument>
</grok:render>

1. **no-setstate-in-loop** (or no-fast-state)  
   - Flag `setState` calls inside `useFrame`, intervals, or fast event handlers (e.g., `onPointerMove`). Suggest using refs or mutations instead.  
   - *Why?* State updates trigger React re-renders, which are expensive in 60fps loops and can cause stuttering. Mutations via refs keep updates off the main thread, maintaining smooth animations—critical for immersive 3D experiences.<grok:render card_id="773d51" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render><grok:render card_id="b99e13" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">24</argument>
</grok:render>

2. **prefer-delta-updates**  
   - Warn if mutations in `useFrame` lack delta time (e.g., `position.x += 0.1` without `delta`). Require using the second `useFrame` argument.  
   - *Why?* Fixed increments ignore frame rate variations, leading to inconsistent motion on different devices. Delta-based updates ensure frame-rate independence, improving portability and perceived smoothness in games or simulations.<grok:render card_id="1e3bc3" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render>

3. **enforce-material-geometry-reuse**  
   - Detect duplicate creations of materials/geometries (e.g., multiple `new THREE.MeshStandardMaterial()`) without `useMemo` or sharing.  
   - *Why?* Duplicates prevent GPU batching and increase memory usage, spiking draw calls in complex scenes. Memoization enables sharing, reducing overhead and aligning with scaling tips for handling 1000+ objects efficiently.<grok:render card_id="50b367" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render><grok:render card_id="be2953" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">23</argument>
</grok:render>

4. **prefer-instanced-mesh**  
   - Flag loops or arrays creating >N (configurable, e.g., 10) identical `<mesh>` components; suggest `<instancedMesh>`.  
   - *Why?* Individual meshes multiply draw calls, bottlenecking the GPU in particle systems or crowds. Instancing collapses them into one call, boosting FPS by orders of magnitude for large-scale visualizations.<grok:render card_id="97723e" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render><grok:render card_id="c5bee4" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">23</argument>
</grok:render>

5. **enforce-demand-frameloop**  
   - Require `frameloop="demand"` on `<Canvas>` unless explicitly disabled (e.g., for always-animating scenes).  
   - *Why?* Default "always" rendering wastes CPU/GPU on static scenes, draining battery. Demand mode renders only on changes, optimizing for interactive apps like viewers or editors.<grok:render card_id="9d5846" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">23</argument>
</grok:render>

### Proposed Best Practices Rules

These focus on R3F's React integration, preventing common errors in component lifecycles and asset handling.

1. **prefer-useloader**  
   - Warn on direct `Loader.load` or `loadAsync` calls; enforce `useLoader` instead.  
   - *Why?* Plain loaders bypass React's suspense and caching, causing redundant fetches and GPU compilations. `useLoader` de-duplicates assets, speeding up loads and reducing memory in multi-component scenes.<grok:render card_id="9226dd" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render><grok:render card_id="94c356" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">24</argument>
</grok:render>

2. **no-mount-unmount-runtime**  
   - Detect conditional rendering of R3F components (e.g., `{show && <Mesh />}`); suggest using `visible` prop.  
   - *Why?* Frequent mounting reinitializes buffers and materials, causing hitches. Toggling visibility preserves state, enabling seamless transitions in dynamic UIs like modals or staged scenes.<grok:render card_id="da5fd4" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">20</argument>
</grok:render>

3. **enforce-lod-for-models**  
   - Flag complex model loads (e.g., GLTF with high vertex count) without `<Detailed>` from @react-three/drei.  
   - *Why?* High-detail models at distance waste GPU cycles. LOD reduces quality progressively, maintaining performance in vast environments like virtual worlds.<grok:render card_id="cbde07" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">23</argument>
</grok:render>

4. **no-unknown-r3f-props** (Config Extension)  
   - Extend `react/no-unknown-property` to ignore valid Three.js props (e.g., `position`, `args`) in R3F JSX tags like `<mesh>`.  
   - *Why?* Standard React ESLint flags these as invalid, leading to noisy false positives. Custom ignoring preserves linting integrity while supporting R3F's declarative style, as discussed in community workarounds.<grok:render card_id="854173" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">21</argument>
</grok:render>

### Implementation Notes

These rules could be added to the existing plugin, leveraging ESLint's JSX and hook parsers. Start with performance ones for immediate gains, as they address R3F's real-time demands. For projects using TypeScript, integrate with `@typescript-eslint` for type-aware checks (e.g., detecting un-memoized geometries). Test against common pitfalls to minimize false positives.<grok:render card_id="102112" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">11</argument>
</grok:render>

### Existing Rules in @react-three/eslint-plugin

Based on the official plugin documentation, it currently provides the following rules focused on performance in hot paths like animation loops:

- **no-clone-in-loop**  
  Disallow cloning vectors in the frame loop, which can cause performance problems by triggering unnecessary allocations and garbage collection.<grok:render card_id="403be2" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">36</argument>
</grok:render>  
  - *Why?* Cloning creates temporary objects that bloat memory in real-time loops (e.g., `useFrame`), leading to GC pauses and frame drops. Encourages reusing pre-allocated temporaries for smoother rendering.

- **no-new-in-loop**  
  Disallow instantiating new objects in the frame loop, which can cause performance problems.<grok:render card_id="8a1c6c" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">36</argument>
</grok:render>  
  - *Why?* Repeated `new` calls (e.g., `new THREE.Vector3()`) in loops allocate memory frequently, degrading FPS in dynamic scenes like simulations or interactions.

These are enabled in the `recommended` config and target common pitfalls in React Three Fiber (R3F) for maintaining high frame rates.

### Proposed Additional Performance Rules

These build on documented pitfalls in R3F, such as frequent object creation, improper state handling, and asset management.<grok:render card_id="173d38" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render> They could extend the plugin by analyzing hooks, JSX, and patterns specific to Three.js integration in React.

1. **no-setstate-in-fast-path**  
   - Flag `setState` calls inside `useFrame`, intervals, or fast event handlers (e.g., `onPointerMove`). Suggest using refs or direct mutations.  
   - *Why?* State updates in loops trigger re-renders, complicating Three.js mutations and causing stuttering. Mutations with deltas ensure frame-rate independence and avoid React scheduler overhead in animations.<grok:render card_id="1ffb5b" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

2. **require-delta-in-updates**  
   - Warn on fixed-value mutations (e.g., `position.x += 0.1`) inside `useFrame` without using the delta parameter.  
   - *Why?* Fixed increments ignore frame rate variations, leading to inconsistent animation speeds across devices (e.g., faster on high-FPS monitors). Delta-based updates (e.g., `position.x += delta * speed`) ensure portability and smoothness.<grok:render card_id="8bd84a" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

3. **enforce-memoized-assets**  
   - Detect non-memoized creation of materials, geometries, or other Three.js objects (e.g., `new THREE.MeshStandardMaterial()` without `useMemo`).  
   - *Why?* Frequent recreation (e.g., on re-renders) requires recompilation, spiking CPU/GPU load and degrading performance in complex scenes. Memoization caches them, reducing overhead.<grok:render card_id="16c9a5" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

4. **prefer-visible-over-conditional**  
   - Flag conditional rendering of R3F components (e.g., `{show && <mesh />}`); suggest using the `visible` prop instead.  
   - *Why?* Conditionals cause mount/unmount cycles, reinitializing buffers and materials expensively. Toggling visibility preserves resources, enabling seamless state changes without performance hits.<grok:render card_id="59e7d9" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

5. **no-new-vectors-in-hot-path**  
   - Extend `no-new-in-loop` to specifically target vector/math object creation (e.g., `new THREE.Vector3()`) in `useFrame` or events, suggesting pre-allocation.  
   - *Why?* These allocations in loops (60+ times/second) force GC interventions, causing jitter in real-time 3D. Reusing globals or locals minimizes memory churn.<grok:render card_id="e16250" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

### Proposed Best Practices Rules

These address API misuse and integration issues, drawing from R3F's declarative nature and common errors like prop validation or loading patterns.

1. **prefer-useloader**  
   - Warn on direct `Loader.load` or `loadAsync` calls; enforce `useLoader` from `@react-three/fiber`.  
   - *Why?* Direct loaders bypass React's suspense and caching, leading to redundant fetches/parsing per component and GPU recompilations. `useLoader` de-duplicates assets, improving load times and efficiency.<grok:render card_id="2fb6ca" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render>

2. **enforce-args-as-array**  
   - Require the `args` prop on R3F primitives (e.g., `<boxGeometry args={[1, 1, 1]} />`) to be an array, flagging non-array usages.  
   - *Why?* `args` maps to constructor parameters and must be an array for consistency with Three.js classes. Incorrect types cause runtime errors or unexpected behavior in geometries/materials.

3. **require-dispose-in-cleanup**  
   - Flag `useEffect` or `useLayoutEffect` creating Three.js objects (e.g., geometries) without a cleanup function calling `.dispose()`.  
   - *Why?* Un-disposed resources leak memory, accumulating in long sessions and causing slowdowns or crashes. Explicit disposal in returns ensures clean lifecycle management.

4. **no-unknown-three-props**  
   - Extend `react/no-unknown-property` to allow valid Three.js props (e.g., `position`, `castShadow`) on R3F JSX tags like `<mesh>`, while flagging invalids.  
   - *Why?* Standard React ESLint flags these as unknown, creating false positives and noise. This ensures accurate linting for R3F's custom elements without disabling the rule entirely.<grok:render card_id="3235c9" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">27</argument>
</grok:render><grok:render card_id="b5dcf4" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">29</argument>
</grok:render>

5. **prefer-uselayouteffect-for-setup**  
   - Warn on `useEffect` for Three.js setup/mutations; suggest `useLayoutEffect` instead.  
   - *Why?* `useEffect` runs post-render, potentially causing visual flickers or double-renders in 3D scenes. `useLayoutEffect` syncs with DOM paints, ensuring stable initialization.

### Implementation Notes

These rules could be added via AST analysis of hooks (integrating with `eslint-plugin-react-hooks`) and JSX tags. For TypeScript projects, leverage `@typescript-eslint` for prop/type checks. Prioritize performance rules, as they directly mitigate R3F's real-time demands.<grok:render card_id="36c736" card_type="citation_card" type="render_inline_citation">
<argument name="citation_id">37</argument>
</grok:render> Test against the pitfalls docs to refine detection and reduce false positives. If adopting, contribute to the pmndrs repo for community alignment.
