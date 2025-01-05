// Import Three.js and necessary addons
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// === 3D Scene Setup ===
let scene, camera, renderer, controls, bookMesh, composer, pixelatePass;
let rotationVelocity = new THREE.Vector2(0, 0.005);

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9bb7df); // same as body background to blend nicely

    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('sceneContainer').appendChild(renderer.domElement);

    // OrbitControls (for click & drag rotation)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Enable damping for smooth deceleration
    controls.dampingFactor = 0.1; // Damping factor for smooth slow down
    controls.enableZoom = false; // disable zoom if you only want rotation
    controls.enablePan = false;  // disable panning

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // Book Geometry (simple box to represent a book)
    const bookWidth = 1;    // x dimension
    const bookHeight = 1.4; // y dimension
    const bookDepth = 0.1;  // z dimension (thickness)
    const geometry = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);

    // Texture
    const textureLoader = new THREE.TextureLoader();
    const coverTexture = textureLoader.load('./assets/bookCover-color.png');
    coverTexture.minFilter = THREE.NearestFilter;
    coverTexture.magFilter = THREE.NearestFilter;
    coverTexture.generateMipmaps = false;
    coverTexture.wrapS = THREE.ClampToEdgeWrapping;
    coverTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Material array for the box's 6 faces
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0xdddddd }), // Left side
        new THREE.MeshBasicMaterial({ color: "hsl(190, 100%, 34%)"}), // Right side
        new THREE.MeshBasicMaterial({ color: 0xdddddd }), // Top
        new THREE.MeshBasicMaterial({ color: 0xdddddd }), // Bottom
        new THREE.MeshBasicMaterial({ map: coverTexture }), // Front
        new THREE.MeshBasicMaterial({ color: "hsl(190, 100%, 37%)" })  // Back
    ];

    bookMesh = new THREE.Mesh(geometry, materials);
    bookMesh.rotation.set(0.3, 0.5, 0);
    bookMesh.scale.set(1.5, 1.5, 1.5);


    scene.add(bookMesh);

    // Set Up Post-Processing
    setupPostProcessing();

    window.addEventListener('resize', onWindowResize, false);
}

function setupPostProcessing() {
    // Initialize EffectComposer
    composer = new EffectComposer(renderer);

    // Add a RenderPass to render the scene
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);


    const PixelationShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            "pixelSize": { value: 20.0 }, // Initial pixel size
            "samples": { value: 4 }        // Number of samples per axis (e.g., 4x4 grid)
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            uniform float pixelSize;
            uniform float samples;
            varying vec2 vUv;
    
            void main() {
                // Calculate the size of each pixel block in UV space
                vec2 blockSize = pixelSize / resolution;
    
                // Determine the top-left corner of the current block
                vec2 blockOrigin = blockSize * floor(vUv / blockSize);
    
                // Calculate the increment between samples within the block
                float stepSize = 1.0 / samples;
                vec2 sampleStep = blockSize * stepSize;
    
                // Initialize the color accumulator
                vec4 accumulatedColor = vec4(0.0);
                float totalSamples = samples * samples;
    
                // Loop through each sample within the block
                for(float x = 0.0; x < samples; x++) {
                    for(float y = 0.0; y < samples; y++) {
                        // Calculate the sample position
                        vec2 samplePos = blockOrigin + (sampleStep * (vec2(x, y) + 0.5));
    
                        // Accumulate the color
                        accumulatedColor += texture2D(tDiffuse, samplePos);
                    }
                }
    
                // Compute the average color
                vec4 averageColor = accumulatedColor / totalSamples;
    
                gl_FragColor = averageColor;
            }
        `
    };

    // Create the ShaderPass for pixelation
    pixelatePass = new ShaderPass(PixelationShader);
    composer.addPass(pixelatePass);

}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    // Update the resolution uniform
    if (pixelatePass) {
        pixelatePass.uniforms["resolution"].value.set(window.innerWidth, window.innerHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Rotate the book mesh if not dragging
    if (!controls.isDragging) {
        bookMesh.rotation.x += rotationVelocity.x;
        bookMesh.rotation.y += rotationVelocity.y;

        rotationVelocity.multiplyScalar(0.999);   
    } 

    controls.update();

    // Render the scene using EffectComposer
    composer.render();
}
