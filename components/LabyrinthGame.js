import React from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class LabyrinthGenerator {
    constructor(seed, biomeTextures) {
        this.seed = seed;
        this.random = this.mulberry32(seed);
        this.biomeTextures = biomeTextures || [];
        this.cellSize = 5;
        this.wallHeight = 4;
        this.currentBiome = 0;
        this.biomeSize = 20; // How many cells before changing biome
    }
    
    mulberry32(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    
    // Get a deterministic value for a coordinate
    getValue(x, z) {
        const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
        return (hash - Math.floor(hash));
    }
    
    // Get a wall value (0 = no wall, 1 = wall)
    getWallValue(x, z) {
        // The further from the origin, the more complex the maze becomes
        const distance = Math.sqrt(x*x + z*z);
        const complexity = Math.min(0.7, 0.3 + distance / 100);
        
        // Combine noise with distance-based complexity
        return this.getValue(x, z) < complexity ? 1 : 0;
    }
    
    getCurrentBiome(x, z) {
        // Change biome based on distance from origin
        const distance = Math.sqrt(x*x + z*z);
        const biomeIndex = Math.floor(distance / this.biomeSize) % this.biomeTextures.length;
        return biomeIndex;
    }
    
    // Get the wall texture for a specific position
    getWallTexture(x, z) {
        const biomeIndex = this.getCurrentBiome(x, z);
        return this.biomeTextures[biomeIndex] || this.biomeTextures[0];
    }
    
    // Check if there's a wall at a specific world position
    hasWallAt(worldX, worldZ) {
        // Convert to grid coordinates
        const gridX = Math.floor(worldX / this.cellSize);
        const gridZ = Math.floor(worldZ / this.cellSize);
        
        return this.getWallValue(gridX, gridZ) === 1;
    }
}

export const LabyrinthGame = React.forwardRef((props, ref) => {
    const { labyrinth, room } = props;
    const containerRef = React.useRef();
    const sceneRef = React.useRef();
    const cameraRef = React.useRef();
    const rendererRef = React.useRef();
    const controlsRef = React.useRef();
    const playerRef = React.useRef({
        position: new THREE.Vector3(0, 2, 0),
        velocity: new THREE.Vector3(),
        onGround: true,
        speed: 10,
        direction: new THREE.Vector3()
    });
    const keysRef = React.useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false
    });
    const mazeGeneratorRef = React.useRef();
    const prevTimeRef = React.useRef(0);
    const wallsRef = React.useRef(new Map());
    const otherPlayersRef = React.useRef(new Map());
    const visibleChunksRef = React.useRef(new Set());
    
    // Set up initial scene, camera, renderer and controls
    React.useEffect(() => {
        if (!containerRef.current) return;
        
        // Initialize scene
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.03);
        scene.background = new THREE.Color(0x000000);
        sceneRef.current = scene;
        
        // Initialize camera
        const camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 2, 0);
        cameraRef.current = camera;
        
        // Initialize renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Initialize controls
        const controls = new PointerLockControls(camera, document.body);
        controlsRef.current = controls;
        scene.add(controls.getObject());
        
        // Handle click to lock controls
        containerRef.current.addEventListener('click', () => {
            controls.lock();
        });
        
        // Set up maze generator with textures from labyrinth
        const textureLoader = new THREE.TextureLoader();
        const biomeTextures = (labyrinth.biomeTextures || []).map(url => {
            const texture = textureLoader.load(url);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
            return texture;
        });
        
        // If no textures provided, use default
        if (biomeTextures.length === 0) {
            const defaultTexture = textureLoader.load('https://images.websim.ai/avatar/default');
            defaultTexture.wrapS = THREE.RepeatWrapping;
            defaultTexture.wrapT = THREE.RepeatWrapping;
            defaultTexture.repeat.set(2, 2);
            biomeTextures.push(defaultTexture);
        }
        
        // Create maze generator with seed based on labyrinth id
        const seed = labyrinth.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        mazeGeneratorRef.current = new LabyrinthGenerator(seed, biomeTextures);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 20, 10);
        scene.add(directionalLight);
        
        // Add floor
        const floorTexture = textureLoader.load('https://images.websim.ai/avatar/default');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(100, 100);
        
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            map: floorTexture,
            color: 0x444444,
            roughness: 1
        });
        const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        
        // Handle window resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            
            rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Handle keyboard input
        const onKeyDown = (e) => {
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    keysRef.current.forward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    keysRef.current.left = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    keysRef.current.backward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    keysRef.current.right = true;
                    break;
                case 'Space':
                    keysRef.current.jump = true;
                    break;
            }
        };
        
        const onKeyUp = (e) => {
            switch (e.code) {
                case 'ArrowUp':
                case 'KeyW':
                    keysRef.current.forward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    keysRef.current.left = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    keysRef.current.backward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    keysRef.current.right = false;
                    break;
                case 'Space':
                    keysRef.current.jump = false;
                    break;
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        // Clean up
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            containerRef.current.removeChild(renderer.domElement);
        };
    }, [labyrinth]);
    
    // Function to handle mobile control inputs
    const handleControlInput = React.useCallback((action) => {
        switch(action) {
            case 'forward':
                keysRef.current.forward = true;
                setTimeout(() => { keysRef.current.forward = false; }, 100);
                break;
            case 'backward':
                keysRef.current.backward = true;
                setTimeout(() => { keysRef.current.backward = false; }, 100);
                break;
            case 'left':
                keysRef.current.left = true;
                setTimeout(() => { keysRef.current.left = false; }, 100);
                break;
            case 'right':
                keysRef.current.right = true;
                setTimeout(() => { keysRef.current.right = false; }, 100);
                break;
            case 'jump':
                keysRef.current.jump = true;
                setTimeout(() => { keysRef.current.jump = false; }, 100);
                break;
            case 'turnLeft':
                if (controlsRef.current) {
                    const rotation = new THREE.Euler(0, Math.PI / 18, 0);
                    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
                    controlsRef.current.getObject().quaternion.multiply(quaternion);
                }
                break;
            case 'turnRight':
                if (controlsRef.current) {
                    const rotation = new THREE.Euler(0, -Math.PI / 18, 0);
                    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
                    controlsRef.current.getObject().quaternion.multiply(quaternion);
                }
                break;
            case 'lookUp':
                if (cameraRef.current) {
                    cameraRef.current.rotation.x += Math.PI / 36;
                    cameraRef.current.rotation.x = Math.min(cameraRef.current.rotation.x, Math.PI / 4);
                }
                break;
            case 'lookDown':
                if (cameraRef.current) {
                    cameraRef.current.rotation.x -= Math.PI / 36;
                    cameraRef.current.rotation.x = Math.max(cameraRef.current.rotation.x, -Math.PI / 4);
                }
                break;
        }
    }, []);
    
    // Expose the control handler via ref
    React.useImperativeHandle(ref, () => ({
        handleControlInput
    }));
    
    // Generate and update chunks around the player
    const updateChunks = React.useCallback(() => {
        if (!sceneRef.current || !mazeGeneratorRef.current || !cameraRef.current) return;
        
        const scene = sceneRef.current;
        const mazeGenerator = mazeGeneratorRef.current;
        const camera = cameraRef.current;
        
        // Get camera position
        const playerX = Math.floor(camera.position.x / mazeGenerator.cellSize);
        const playerZ = Math.floor(camera.position.z / mazeGenerator.cellSize);
        
        // View distance in chunks
        const viewDistance = 5;
        const newVisibleChunks = new Set();
        
        // Generate/update chunks around player
        for (let x = playerX - viewDistance; x <= playerX + viewDistance; x++) {
            for (let z = playerZ - viewDistance; z <= playerZ + viewDistance; z++) {
                const chunkKey = `${x},${z}`;
                newVisibleChunks.add(chunkKey);
                
                // If chunk is already loaded, skip
                if (wallsRef.current.has(chunkKey)) continue;
                
                // Generate new chunk
                if (mazeGenerator.getWallValue(x, z) === 1) {
                    // Create wall
                    const wallGeometry = new THREE.BoxGeometry(
                        mazeGenerator.cellSize, 
                        mazeGenerator.wallHeight, 
                        mazeGenerator.cellSize
                    );
                    
                    // Get texture based on position (biome)
                    const textureIndex = mazeGenerator.getCurrentBiome(x, z);
                    const wallTexture = mazeGenerator.biomeTextures[textureIndex] || mazeGenerator.biomeTextures[0];
                    
                    const wallMaterial = new THREE.MeshStandardMaterial({
                        map: wallTexture,
                        roughness: 0.8,
                    });
                    
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(
                        x * mazeGenerator.cellSize + mazeGenerator.cellSize / 2, 
                        mazeGenerator.wallHeight / 2, 
                        z * mazeGenerator.cellSize + mazeGenerator.cellSize / 2
                    );
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    
                    scene.add(wall);
                    wallsRef.current.set(chunkKey, wall);
                }
            }
        }
        
        // Remove chunks that are too far
        for (const chunkKey of wallsRef.current.keys()) {
            if (!newVisibleChunks.has(chunkKey)) {
                const wall = wallsRef.current.get(chunkKey);
                scene.remove(wall);
                wallsRef.current.delete(chunkKey);
            }
        }
        
        visibleChunksRef.current = newVisibleChunks;
    }, []);
    
    // Collision detection
    const checkCollision = React.useCallback((position) => {
        if (!mazeGeneratorRef.current) return false;
        
        const mazeGenerator = mazeGeneratorRef.current;
        const playerRadius = 0.5;
        
        // Check collision with walls
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const checkX = position.x + Math.cos(angle) * playerRadius;
            const checkZ = position.z + Math.sin(angle) * playerRadius;
            
            if (mazeGenerator.hasWallAt(checkX, checkZ)) {
                return true;
            }
        }
        
        return false;
    }, []);
    
    // Set up multiplayer
    React.useEffect(() => {
        if (!room) return;
        
        // Send position updates
        const sendPositionInterval = setInterval(() => {
            if (!controlsRef.current || !cameraRef.current) return;
            
            const camera = cameraRef.current;
            const controls = controlsRef.current;
            
            room.send({
                type: 'position',
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z,
                rotation: controls.getObject().rotation.y,
                labyrinthId: labyrinth.id
            });
        }, 100);
        
        // Handle messages from other players
        room.onmessage = (event) => {
            const data = event.data;
            
            if (data.type === 'position' && data.labyrinthId === labyrinth.id) {
                const { clientId, username, x, y, z, rotation } = data;
                
                // Skip own messages
                if (clientId === room.party.client.id) return;
                
                // If this is a new player, create a representation
                if (!otherPlayersRef.current.has(clientId)) {
                    const playerGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
                    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x7e57c2 });
                    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
                    
                    // Add player label
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 64;
                    const context = canvas.getContext('2d');
                    context.fillStyle = '#000000';
                    context.globalAlpha = 0.7;
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.globalAlpha = 1;
                    context.fillStyle = '#ffffff';
                    context.font = '30px Arial';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(username, canvas.width / 2, canvas.height / 2);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.y = 2.5;
                    sprite.scale.set(2, 0.5, 1);
                    
                    playerMesh.add(sprite);
                    sceneRef.current.add(playerMesh);
                    otherPlayersRef.current.set(clientId, playerMesh);
                }
                
                // Update player position
                const playerMesh = otherPlayersRef.current.get(clientId);
                if (playerMesh) {
                    playerMesh.position.set(x, y, z);
                    playerMesh.rotation.y = rotation;
                }
            }
        };
        
        // Handle player disconnects
        const handlePeersChange = (peers) => {
            // Check for disconnected players
            for (const clientId of otherPlayersRef.current.keys()) {
                if (!peers[clientId]) {
                    const playerMesh = otherPlayersRef.current.get(clientId);
                    if (playerMesh) {
                        sceneRef.current.remove(playerMesh);
                        otherPlayersRef.current.delete(clientId);
                    }
                }
            }
        };
        
        const unsubscribe = room.party.subscribe(handlePeersChange);
        
        return () => {
            clearInterval(sendPositionInterval);
            unsubscribe();
        };
    }, [room, labyrinth]);
    
    // Animation loop
    React.useEffect(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        
        const animate = (time) => {
            requestAnimationRef.current = requestAnimationFrame(animate);
            
            const renderer = rendererRef.current;
            const scene = sceneRef.current;
            const camera = cameraRef.current;
            const controls = controlsRef.current;
            
            if (!controls || !controls.isLocked) {
                return;
            }
            
            // Calculate delta time
            const delta = (time - prevTimeRef.current) / 1000;
            prevTimeRef.current = time;
            
            // Update chunks
            updateChunks();
            
            // Movement
            const player = playerRef.current;
            const keys = keysRef.current;
            
            player.velocity.x = 0;
            player.velocity.z = 0;
            
            // Calculate movement direction
            const moveDirection = new THREE.Vector3();
            
            if (keys.forward) moveDirection.z -= 1;
            if (keys.backward) moveDirection.z += 1;
            if (keys.left) moveDirection.x -= 1;
            if (keys.right) moveDirection.x += 1;
            
            // Normalize for diagonal movement
            if (moveDirection.length() > 0) {
                moveDirection.normalize();
            }
            
            // Apply camera direction
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            // Create the right vector perpendicular to the direction
            const right = new THREE.Vector3().crossVectors(
                new THREE.Vector3(0, 1, 0),
                cameraDirection
            );
            
            // Calculate the actual movement vector
            player.velocity.copy(cameraDirection)
                .multiplyScalar(moveDirection.z)
                .add(right.multiplyScalar(moveDirection.x))
                .multiplyScalar(player.speed * delta);
            
            // Check for collision and move player
            const newPosition = camera.position.clone().add(player.velocity);
            
            if (!checkCollision(newPosition)) {
                camera.position.copy(newPosition);
                controls.getObject().position.copy(camera.position);
            }
            
            // Render
            renderer.render(scene, camera);
        };
        
        const requestAnimationRef = { current: requestAnimationFrame(animate) };
        
        return () => {
            cancelAnimationFrame(requestAnimationRef.current);
        };
    }, [updateChunks, checkCollision]);
    
    return <div ref={containerRef} className="game-canvas"></div>;
});

