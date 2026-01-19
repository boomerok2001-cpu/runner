// Run From Justice - Browser Game
// Satirical Endless Runner

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    // Lane settings
    laneWidth: 4,
    laneCount: 3,

    // Speed settings - Balanced
    initialSpeed: 0.65,
    maxSpeed: 2.5,
    speedIncrease: 0.0007,

    // Path generation
    tileLength: 30,
    visibleTiles: 8,

    // Character
    jumpHeight: 4,
    jumpDuration: 500,
    slideDuration: 600,
    laneChangeDuration: 150,

    // elPresidente chaser - Balanced pressure
    chaserDistance: 11,
    chaserSpeedMultiplier: 0.983,
    chaserCatchDistance: 3,

    // Scoring
    moneyValue: 100,
    distanceMultiplier: 1,

    // Obstacles
    obstacleFrequency: 0.4,
    moneyFrequency: 0.6,
    kidsFrequency: 0.5,
    kidsValue: 200,
};

// ============================================
// GAME STATE
// ============================================
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    money: 0,
    distance: 0,
    speed: CONFIG.initialSpeed,
    currentLane: 0,
    isJumping: false,
    isSliding: false,
    jumpStartTime: 0,
    slideStartTime: 0,
    targetLane: 0,
    laneChangeStartTime: 0,
    laneChangeStartPos: 0,
    highScore: parseInt(localStorage.getItem('runFromJusticeHighScore')) || 0,
    selectedCharacter: 'runner1',
    kids: 0,
    currentEnvironment: 0,
};

// ============================================
// ENVIRONMENT THEMES (change based on distance)
// ============================================
const ENVIRONMENTS = [
    { // City Night (0-500m)
        name: 'City Night',
        fog: 0x0a0a1a,
        sky: 0x0a0a1a,
        road: 0x2a2a2a,
        buildings: [0x3a3a4a, 0x4a4a5a, 0x2a2a3a, 0x5a5a6a],
        ambient: 0x334466,
        windowLight: 0xffffaa
    },
    { // Highway (500-1000m)
        name: 'Highway',
        fog: 0x1a1a2a,
        sky: 0x0d1020,
        road: 0x3a3a3a,
        buildings: [0x2a3a4a, 0x3a4a5a, 0x1a2a3a],
        ambient: 0x445566,
        windowLight: 0xffcc77
    },
    { // Industrial (1000-1500m)
        name: 'Industrial',
        fog: 0x1a1510,
        sky: 0x151210,
        road: 0x252520,
        buildings: [0x4a4540, 0x5a5550, 0x3a3530],
        ambient: 0x554433,
        windowLight: 0xff8844
    },
    { // Airport (1500-2000m)
        name: 'Airport',
        fog: 0x0a1020,
        sky: 0x050810,
        road: 0x2a2a30,
        buildings: [0x3a3a4a, 0x4a4a5a, 0x2a2a3a],
        ambient: 0x334455,
        windowLight: 0x00ffff
    },
    { // Border (2000m+)
        name: 'Border',
        fog: 0x101510,
        sky: 0x0a0f0a,
        road: 0x202520,
        buildings: [0x354035, 0x405040, 0x253025],
        ambient: 0x223322,
        windowLight: 0x44ff44
    }
];

// ============================================
// AUDIO SYSTEM
// ============================================
const AudioSystem = {
    bgMusic: null,
    sounds: {},
    musicVolume: 0.3,
    sfxVolume: 0.5,
    enabled: true,

    init() {
        // Create audio context on user interaction
        this.audioContext = null;

        // Background music - calm synth
        this.bgMusic = new Audio();
        this.bgMusic.loop = true;
        this.bgMusic.volume = this.musicVolume;

        // Generate procedural background music
        this.createProceduralMusic();

        // Sound effects using oscillators
        this.initSoundEffects();
    },

    createProceduralMusic() {
        // Use Web Audio API for procedural calm music
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.audioContext.destination);
        } catch (e) {
            console.log('Web Audio not supported');
        }
    },

    initSoundEffects() {
        // Will create sounds on demand using oscillators
    },

    playMusic() {
        if (!this.enabled || !this.audioContext) return;

        // Create calm ambient music loop
        this.playAmbientLoop();
    },

    playAmbientLoop() {
        if (!this.audioContext || this.ambientPlaying) return;
        this.ambientPlaying = true;

        const playNote = (freq, time, duration) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.05 * this.musicVolume, time + 0.1);
            gain.gain.linearRampToValueAtTime(0, time + duration);

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.start(time);
            osc.stop(time + duration);
        };

        // Calm chord progression
        const chords = [
            [220, 277, 330], // Am
            [196, 247, 294], // G
            [175, 220, 262], // F
            [165, 208, 247], // E
        ];

        const playLoop = () => {
            if (!gameState.isRunning && !this.ambientPlaying) return;

            const now = this.audioContext.currentTime;
            const chordDuration = 2;

            chords.forEach((chord, i) => {
                chord.forEach(note => {
                    playNote(note, now + i * chordDuration, chordDuration * 0.9);
                });
            });

            // Schedule next loop
            setTimeout(() => {
                if (gameState.isRunning) playLoop();
            }, chords.length * chordDuration * 1000);
        };

        playLoop();
    },

    stopMusic() {
        this.ambientPlaying = false;
    },

    playCoinSound() {
        if (!this.enabled || !this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, this.audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.2);
    },

    playJumpSound() {
        if (!this.enabled || !this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.2, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    },

    playSlideSound() {
        if (!this.enabled || !this.audioContext) return;

        const noise = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        noise.type = 'sawtooth';
        noise.frequency.value = 80;

        gain.gain.setValueAtTime(this.sfxVolume * 0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        noise.connect(gain);
        gain.connect(this.audioContext.destination);

        noise.start();
        noise.stop(this.audioContext.currentTime + 0.3);
    },

    playCrashSound() {
        if (!this.enabled || !this.audioContext) return;

        // Impact sound
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.3);

        gain.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    },

    playCaughtSound() {
        if (!this.enabled || !this.audioContext) return;

        // Dramatic caught fanfare
        const notes = [220, 175, 147, 110];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'sawtooth';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

                osc.connect(gain);
                gain.connect(this.audioContext.destination);

                osc.start();
                osc.stop(this.audioContext.currentTime + 0.4);
            }, i * 150);
        });
    },

    playLaneChange() {
        if (!this.enabled || !this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = 440;

        gain.gain.setValueAtTime(this.sfxVolume * 0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.08);
    },

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
};

// ============================================
// THREE.JS SETUP
// ============================================
let scene, camera, renderer;
let character, elPresidente;
let tiles = [];
let obstacles = [];
let moneyItems = [];
let kidItems = [];
let nextTileZ = 0;

// Character colors
const CHARACTER_COLORS = {
    runner1: { skin: 0x4a3020, suit: 0x1a1a1a, pants: 0x0a0a0a },
    runner2: { skin: 0xd4a574, suit: 0x2a2a4a, pants: 0x1a1a2a },
    runner3: { skin: 0xb8956a, suit: 0x3a5a3a, pants: 0x2a3a2a },
};

function init() {
    // Scene - city at night
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 60, 150); // Less fog for visibility

    // Camera - positioned higher to see elPresidente behind player
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 2, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('gameCanvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize audio system
    AudioSystem.init();

    // Lighting
    setupLighting();

    // Create elPresidente chaser
    createElPresidente();

    // Generate initial path
    for (let i = 0; i < CONFIG.visibleTiles; i++) {
        generateTile();
    }

    // Event listeners
    setupControls();
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function setupLighting() {
    // Ambient light - city night
    const ambient = new THREE.AmbientLight(0x334466, 0.5);
    scene.add(ambient);

    // Main directional light (streetlight feel)
    const dirLight = new THREE.DirectionalLight(0xffffaa, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Red/blue police lights
    const redLight = new THREE.PointLight(0xff0000, 1, 30);
    redLight.position.set(-5, 8, 10);
    scene.add(redLight);

    const blueLight = new THREE.PointLight(0x0000ff, 1, 30);
    blueLight.position.set(5, 8, 10);
    scene.add(blueLight);

    // Animate police lights
    setInterval(() => {
        redLight.intensity = redLight.intensity > 0.5 ? 0.2 : 1;
        blueLight.intensity = blueLight.intensity > 0.5 ? 0.2 : 1;
    }, 500);
}

// ============================================
// CHARACTER CREATION (Runner) - Enhanced Graphics
// ============================================
function createCharacter(charType = 'diddy') {
    if (character) {
        scene.remove(character);
    }

    character = new THREE.Group();
    const colors = CHARACTER_COLORS[charType] || CHARACTER_COLORS.runner1;

    // Use Phong materials for better shading
    const skinMat = new THREE.MeshPhongMaterial({
        color: colors.skin,
        shininess: 30,
        specular: 0x222222
    });
    const suitMat = new THREE.MeshPhongMaterial({
        color: colors.suit,
        shininess: 50,
        specular: 0x111111
    });
    const pantsMat = new THREE.MeshPhongMaterial({
        color: colors.pants,
        shininess: 20
    });
    const shoeMat = new THREE.MeshPhongMaterial({
        color: 0x0a0a0a,
        shininess: 80,
        specular: 0x333333
    });

    // Body (suit) - slightly rounded
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.6, 0.5),
        suitMat
    );
    torso.position.y = 2.3;
    torso.castShadow = true;
    character.add(torso);

    // Collar / Tie
    const tieMat = new THREE.MeshPhongMaterial({ color: 0x880000, shininess: 60 });
    const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.8, 0.1),
        tieMat
    );
    tie.position.set(0, 2.3, 0.28);
    character.add(tie);

    // Head - more rounded
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 12, 12),
        skinMat
    );
    head.position.y = 3.5;
    head.castShadow = true;
    character.add(head);

    // Eyes
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

    const leftEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
    leftEyeWhite.position.set(-0.15, 3.55, 0.38);
    character.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeWhiteMat);
    rightEyeWhite.position.set(0.15, 3.55, 0.38);
    character.add(rightEyeWhite);

    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyePupilMat);
    leftPupil.position.set(-0.15, 3.55, 0.44);
    character.add(leftPupil);

    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyePupilMat);
    rightPupil.position.set(0.15, 3.55, 0.44);
    character.add(rightPupil);

    // Hair based on character
    let hairMat;
    if (charType === 'runner1') {
        hairMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 80 });
    } else if (charType === 'runner2') {
        hairMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, shininess: 50 });
    } else {
        hairMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 60 });
    }

    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        hairMat
    );
    hair.position.y = 3.5;
    hair.rotation.x = -0.2;
    character.add(hair);

    // runner3 mustache
    if (charType === 'runner3') {
        const mustache = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.08, 0.08),
            new THREE.MeshPhongMaterial({ color: 0x0a0a0a })
        );
        mustache.position.set(0, 3.3, 0.42);
        character.add(mustache);
    }

    // Eyebrows
    const browMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), browMat);
    leftBrow.position.set(-0.15, 3.68, 0.4);
    leftBrow.rotation.z = 0.1;
    character.add(leftBrow);

    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), browMat);
    rightBrow.position.set(0.15, 3.68, 0.4);
    rightBrow.rotation.z = -0.1;
    character.add(rightBrow);

    // Arms - with shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeo, suitMat);
    leftShoulder.position.set(-0.6, 2.8, 0);
    character.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, suitMat);
    rightShoulder.position.set(0.6, 2.8, 0);
    character.add(rightShoulder);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.9, 8);

    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.65, 2.2, 0);
    leftArm.castShadow = true;
    character.add(leftArm);
    character.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo, suitMat);
    rightArm.position.set(0.65, 2.2, 0);
    rightArm.castShadow = true;
    character.add(rightArm);
    character.rightArm = rightArm;

    // Hands
    const handGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.65, 1.65, 0);
    character.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.65, 1.65, 0);
    character.add(rightHand);

    // Money bag
    const bagMat = new THREE.MeshPhongMaterial({ color: 0x1a4a1a, shininess: 30 });
    const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.45, 0.25),
        bagMat
    );
    bag.position.set(0.45, 2.1, 0.35);
    character.add(bag);

    // $ on bag
    const dollarMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const dollar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.02), dollarMat);
    dollar.position.set(0.45, 2.15, 0.48);
    character.add(dollar);

    // Legs - cylindrical
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.0, 8);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.25, 0.9, 0);
    leftLeg.castShadow = true;
    character.add(leftLeg);
    character.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.25, 0.9, 0);
    rightLeg.castShadow = true;
    character.add(rightLeg);
    character.rightLeg = rightLeg;

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.15, 0.35);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.25, 0.3, 0.05);
    character.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.25, 0.3, 0.05);
    character.add(rightShoe);

    character.position.set(0, 0, 0);
    scene.add(character);
}

// ============================================
// elPresidente CHASER CREATION (Cartoon Dictator)
// ============================================
function createElPresidente() {
    elPresidente = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 }); // Tan skin
    const uniformMat = new THREE.MeshLambertMaterial({ color: 0x2a4a2a }); // Military olive green
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Gold for medals/trim
    const capMat = new THREE.MeshLambertMaterial({ color: 0x1a3a1a }); // Dark green cap
    const bootMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Black boots

    // Larger body (intimidating military uniform)
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2.2, 1),
        uniformMat
    );
    torso.position.y = 3;
    elPresidente.add(torso);

    // Military medals/decorations
    for (let i = 0; i < 3; i++) {
        const medal = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.25, 0.1),
            goldMat
        );
        medal.position.set(-0.4 + i * 0.3, 3.3, 0.55);
        elPresidente.add(medal);
    }

    // Shoulder epaulettes (gold)
    const epauletteMat = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const leftEpaulette = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.15, 0.5),
        epauletteMat
    );
    leftEpaulette.position.set(-1.1, 4, 0);
    elPresidente.add(leftEpaulette);

    const rightEpaulette = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.15, 0.5),
        epauletteMat
    );
    rightEpaulette.position.set(1.1, 4, 0);
    elPresidente.add(rightEpaulette);

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 12, 12),
        skinMat
    );
    head.position.y = 4.9;
    elPresidente.add(head);

    // Military peaked cap
    const capBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.08, 16),
        capMat
    );
    capBrim.position.set(0, 5.3, 0.2);
    capBrim.rotation.x = 0.2;
    elPresidente.add(capBrim);

    const capTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.7, 0.4, 16),
        capMat
    );
    capTop.position.y = 5.5;
    elPresidente.add(capTop);

    // Gold cap emblem
    const emblem = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.1),
        goldMat
    );
    emblem.position.set(0, 5.35, 0.65);
    elPresidente.add(emblem);

    // Eyes (menacing look)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

    const leftEyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        eyeWhiteMat
    );
    leftEyeWhite.position.set(-0.2, 4.95, 0.55);
    elPresidente.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        eyeWhiteMat
    );
    rightEyeWhite.position.set(0.2, 4.95, 0.55);
    elPresidente.add(rightEyeWhite);

    const leftPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        eyePupilMat
    );
    leftPupil.position.set(-0.2, 4.95, 0.65);
    elPresidente.add(leftPupil);

    const rightPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        eyePupilMat
    );
    rightPupil.position.set(0.2, 4.95, 0.65);
    elPresidente.add(rightPupil);

    // Thick bushy mustache (dictator style)
    const mustacheMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const mustache = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.15),
        mustacheMat
    );
    mustache.position.set(0, 4.6, 0.6);
    elPresidente.add(mustache);

    // Mouth (stern frown)
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    );
    mouth.position.set(0, 4.45, 0.6);
    elPresidente.add(mouth);

    // Arms (reaching forward)
    const armGeo = new THREE.BoxGeometry(0.5, 1.8, 0.5);

    const leftArm = new THREE.Mesh(armGeo, uniformMat);
    leftArm.position.set(-1.2, 2.5, 0.5);
    leftArm.rotation.x = -0.5;
    elPresidente.add(leftArm);
    elPresidente.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo, uniformMat);
    rightArm.position.set(1.2, 2.5, 0.5);
    rightArm.rotation.x = -0.5;
    elPresidente.add(rightArm);
    elPresidente.rightArm = rightArm;

    // Hands
    const handGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.8, 2.5, 1.5);
    elPresidente.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.8, 2.5, 1.5);
    elPresidente.add(rightHand);

    // Baton/Scepter instead of shotgun
    const scepterGroup = new THREE.Group();

    const scepterMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const scepterStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8),
        scepterMat
    );
    scepterStick.rotation.x = Math.PI / 2;
    scepterStick.position.z = 0.8;
    scepterGroup.add(scepterStick);

    // Gold ornament on scepter
    const scepterTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        goldMat
    );
    scepterTop.position.z = 1.6;
    scepterGroup.add(scepterTop);

    scepterGroup.position.set(0, 2.5, 1);
    elPresidente.add(scepterGroup);
    elPresidente.scepter = scepterGroup;

    // Legs in military pants
    const legGeo = new THREE.BoxGeometry(0.6, 1.8, 0.5);

    const leftLeg = new THREE.Mesh(legGeo, uniformMat);
    leftLeg.position.set(-0.5, 0.9, 0);
    elPresidente.add(leftLeg);
    elPresidente.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, uniformMat);
    rightLeg.position.set(0.5, 0.9, 0);
    elPresidente.add(rightLeg);
    elPresidente.rightLeg = rightLeg;

    // Add a red glow behind elPresidente (dramatic effect)
    const chaserGlow = new THREE.PointLight(0xff4444, 0.8, 20);
    chaserGlow.position.set(0, 3, -2);
    elPresidente.add(chaserGlow);

    elPresidente.position.set(0, 0, CONFIG.chaserDistance);
    scene.add(elPresidente);
}

// ============================================
// CITY TILE GENERATION
// ============================================
function generateTile() {
    const tile = new THREE.Group();

    // Asphalt road
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const road = new THREE.Mesh(
        new THREE.BoxGeometry(CONFIG.laneWidth * 3 + 4, 0.5, CONFIG.tileLength),
        roadMat
    );
    road.position.y = -0.25;
    road.receiveShadow = true;
    tile.add(road);

    // Lane markings (yellow dashes)
    const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = -1; i <= 1; i += 2) {
        for (let z = -12; z <= 12; z += 8) {
            const marking = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.02, 3),
                markingMat
            );
            marking.position.set(i * CONFIG.laneWidth * 0.5, 0.01, z);
            tile.add(marking);
        }
    }

    // Sidewalks
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const leftSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, CONFIG.tileLength),
        sidewalkMat
    );
    leftSidewalk.position.set(-(CONFIG.laneWidth * 1.5 + 2), 0.15, 0);
    tile.add(leftSidewalk);

    const rightSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, CONFIG.tileLength),
        sidewalkMat
    );
    rightSidewalk.position.set(CONFIG.laneWidth * 1.5 + 2, 0.15, 0);
    tile.add(rightSidewalk);

    // Buildings on sides
    addBuildings(tile);

    // Street lights
    addStreetLights(tile);

    tile.position.z = -nextTileZ;
    scene.add(tile);
    tiles.push(tile);

    // Add obstacles and money
    if (tiles.length > 2) {
        if (Math.random() < CONFIG.obstacleFrequency) {
            addObstacle(tile, -nextTileZ);
        }
        if (Math.random() < CONFIG.moneyFrequency) {
            addMoney(tile, -nextTileZ);
        }
        if (Math.random() < CONFIG.kidsFrequency) {
            addKids(tile, -nextTileZ);
        }
    }

    nextTileZ += CONFIG.tileLength;
}

function addBuildings(tile) {
    // Use current environment's building colors
    const env = ENVIRONMENTS[gameState.currentEnvironment];
    const buildingColors = env.buildings;

    // Left side buildings
    for (let z = -10; z <= 10; z += 20) {
        const height = 15 + Math.random() * 25;
        const buildingMat = new THREE.MeshLambertMaterial({
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
        });

        const building = new THREE.Mesh(
            new THREE.BoxGeometry(8, height, 10),
            buildingMat
        );
        building.position.set(-(CONFIG.laneWidth * 1.5 + 8), height / 2, z);
        building.castShadow = true;
        tile.add(building);

        // Windows
        addWindows(building, tile, height);
    }

    // Right side buildings
    for (let z = -10; z <= 10; z += 20) {
        const height = 15 + Math.random() * 25;
        const buildingMat = new THREE.MeshLambertMaterial({
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
        });

        const building = new THREE.Mesh(
            new THREE.BoxGeometry(8, height, 10),
            buildingMat
        );
        building.position.set(CONFIG.laneWidth * 1.5 + 8, height / 2, z);
        building.castShadow = true;
        tile.add(building);

        addWindows(building, tile, height);
    }
}

function addWindows(building, tile, height) {
    // Use current environment's window light color
    const env = ENVIRONMENTS[gameState.currentEnvironment];
    const windowMat = new THREE.MeshBasicMaterial({ color: env.windowLight || 0xffffaa });
    const darkWindowMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a });

    const x = building.position.x;
    const z = building.position.z;
    const side = x > 0 ? -1 : 1;

    for (let y = 3; y < height - 2; y += 4) {
        for (let wz = -3; wz <= 3; wz += 3) {
            const isLit = Math.random() > 0.3;
            const window = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 2, 1.5),
                isLit ? windowMat : darkWindowMat
            );
            window.position.set(x + side * 4.05, y, z + wz);
            tile.add(window);
        }
    }
}

function addStreetLights(tile) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });

    const positions = [
        { x: -(CONFIG.laneWidth * 1.5 + 1), z: 0 },
        { x: CONFIG.laneWidth * 1.5 + 1, z: 0 }
    ];

    positions.forEach(pos => {
        // Pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.15, 6, 6),
            poleMat
        );
        pole.position.set(pos.x, 3, pos.z);
        tile.add(pole);

        // Light head
        const lightHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.2, 0.5),
            lightMat
        );
        lightHead.position.set(pos.x + (pos.x > 0 ? -0.3 : 0.3), 6, pos.z);
        tile.add(lightHead);

        // Light
        const light = new THREE.PointLight(0xffffcc, 0.3, 12);
        light.position.set(pos.x, 5.5, pos.z);
        tile.add(light);
    });
}

// ============================================
// OBSTACLES (City themed)
// ============================================
function addObstacle(tile, tileZ) {
    const obstacleType = Math.floor(Math.random() * 4);
    const lane = Math.floor(Math.random() * 3) - 1;
    const laneX = lane * CONFIG.laneWidth;
    const zOffset = (Math.random() - 0.5) * 15;

    let obstacle;

    switch (obstacleType) {
        case 0: // Police barrier (jump over)
            obstacle = createPoliceBarrier();
            obstacle.type = 'barrier_low';
            obstacle.height = 1;
            break;
        case 1: // Police tape (slide under)
            obstacle = createPoliceTape();
            obstacle.type = 'tape';
            obstacle.height = 3;
            break;
        case 2: // Trash can (jump over)
            obstacle = createTrashCan();
            obstacle.type = 'trash';
            obstacle.height = 0.8;
            break;
        case 3: // Police car (dodge)
            obstacle = createPoliceCar();
            obstacle.type = 'car';
            obstacle.height = 5;
            break;
    }

    obstacle.position.set(laneX, 0, zOffset);
    obstacle.lane = lane;
    obstacle.worldZ = tileZ + zOffset;
    tile.add(obstacle);
    obstacles.push(obstacle);
}

function createPoliceBarrier() {
    const group = new THREE.Group();

    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Main barrier
    const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1, 0.3),
        barrierMat
    );
    barrier.position.y = 0.5;
    group.add(barrier);

    // White stripes
    for (let i = -1; i <= 1; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.2, 0.32),
            stripeMat
        );
        stripe.position.set(i, 0.5, 0);
        group.add(stripe);
    }

    return group;
}

function createPoliceTape() {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Poles
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 6);

    const leftPole = new THREE.Mesh(poleGeo, poleMat);
    leftPole.position.set(-1.5, 2, 0);
    group.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeo, poleMat);
    rightPole.position.set(1.5, 2, 0);
    group.add(rightPole);

    // Tape (slide under)
    const tape = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.3, 0.05),
        tapeMat
    );
    tape.position.y = 3;
    group.add(tape);

    return group;
}

function createTrashCan() {
    const group = new THREE.Group();

    const canMat = new THREE.MeshLambertMaterial({ color: 0x2a4a2a });
    const lidMat = new THREE.MeshLambertMaterial({ color: 0x1a3a1a });

    // Can
    const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 1.2, 8),
        canMat
    );
    can.position.y = 0.6;
    group.add(can);

    // Lid
    const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.1, 8),
        lidMat
    );
    lid.position.y = 1.25;
    group.add(lid);

    // Scattered trash
    const trashMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    for (let i = 0; i < 3; i++) {
        const trash = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.1, 0.2),
            trashMat
        );
        trash.position.set((Math.random() - 0.5) * 1.5, 0.05, (Math.random() - 0.5));
        trash.rotation.y = Math.random() * Math.PI;
        group.add(trash);
    }

    return group;
}

function createPoliceCar() {
    const group = new THREE.Group();

    const carBodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const carDoorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.2, 4),
        carBodyMat
    );
    body.position.y = 0.8;
    group.add(body);

    // White door panels
    const door1 = new THREE.Mesh(
        new THREE.BoxGeometry(2.52, 0.8, 1),
        carDoorMat
    );
    door1.position.set(0, 0.7, 0.5);
    group.add(door1);

    // Roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.8, 2),
        carBodyMat
    );
    roof.position.y = 1.8;
    group.add(roof);

    // Light bar
    const lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.3, 0.5),
        lightBarMat
    );
    lightBar.position.y = 2.3;
    group.add(lightBar);

    // Flashing light
    const carLight = new THREE.PointLight(0xff0000, 1, 10);
    carLight.position.set(0, 2.5, 0);
    group.add(carLight);

    return group;
}

// ============================================
// MONEY (Instead of coins)
// ============================================
function addMoney(tile, tileZ) {
    const pattern = Math.floor(Math.random() * 3);
    const moneyMat = new THREE.MeshLambertMaterial({
        color: 0x00aa00,
        emissive: 0x004400,
        emissiveIntensity: 0.3
    });

    const lane = Math.floor(Math.random() * 3) - 1;
    const laneX = lane * CONFIG.laneWidth;

    switch (pattern) {
        case 0: // Line of money
            for (let i = 0; i < 5; i++) {
                createMoneyItem(tile, laneX, 1.5, -10 + i * 4, tileZ, moneyMat);
            }
            break;
        case 1: // Arc
            for (let i = 0; i < 5; i++) {
                const height = 1.5 + Math.sin(i / 4 * Math.PI) * 2;
                createMoneyItem(tile, laneX, height, -8 + i * 4, tileZ, moneyMat);
            }
            break;
        case 2: // Scattered
            for (let i = 0; i < 3; i++) {
                const mLane = Math.floor(Math.random() * 3) - 1;
                createMoneyItem(tile, mLane * CONFIG.laneWidth, 1.5, (Math.random() - 0.5) * 20, tileZ, moneyMat);
            }
            break;
    }
}

function createMoneyItem(tile, x, y, z, tileZ, material) {
    const money = new THREE.Group();

    // Dollar bill shape
    const bill = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.02, 0.4),
        material
    );
    money.add(bill);

    // $ symbol
    const symbolMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const symbol = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.01, 0.2),
        symbolMat
    );
    symbol.position.y = 0.015;
    money.add(symbol);

    money.position.set(x, y, z);
    money.worldZ = tileZ + z;
    money.collected = false;
    tile.add(money);
    moneyItems.push(money);
}

// ============================================
// KIDS (Collectibles that come to player)
// ============================================
function addKids(tile, tileZ) {
    const kidCount = 1 + Math.floor(Math.random() * 2); // 1-2 kids per spawn

    for (let i = 0; i < kidCount; i++) {
        const lane = Math.floor(Math.random() * 3) - 1;
        const laneX = lane * CONFIG.laneWidth;
        const zOffset = (Math.random() - 0.5) * 20;
        createKidItem(tile, laneX, 0.8, zOffset, tileZ);
    }
}

function createKidItem(tile, x, y, z, tileZ) {
    const kid = new THREE.Group();

    // Kid body colors (varying)
    const shirtColors = [0xff6699, 0x6699ff, 0xffff66, 0x66ff99, 0xff9966];
    const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x4444aa });

    // Small body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.5, 0.25),
        shirtMat
    );
    body.position.y = 0.5;
    kid.add(body);

    // Head (bigger proportionally like a kid)
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.4, 0.35),
        skinMat
    );
    head.position.y = 0.95;
    kid.add(head);

    // Hair
    const hairMat = new THREE.MeshLambertMaterial({
        color: Math.random() > 0.5 ? 0x4a3020 : 0xffcc00
    });
    const hair = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.15, 0.38),
        hairMat
    );
    hair.position.y = 1.2;
    kid.add(hair);

    // Legs (short)
    const legGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.1, 0.15, 0);
    kid.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.1, 0.15, 0);
    kid.add(rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.25, 0.5, 0);
    kid.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.25, 0.5, 0);
    kid.add(rightArm);

    // Add a small glow around the kid
    const kidGlow = new THREE.PointLight(0xff88ff, 0.3, 5);
    kidGlow.position.y = 0.5;
    kid.add(kidGlow);

    kid.position.set(x, y, z);
    kid.worldZ = tileZ + z;
    kid.collected = false;
    kid.originalX = x;
    tile.add(kid);
    kidItems.push(kid);
}

// ============================================
// CONTROLS
// ============================================
function setupControls() {
    document.addEventListener('keydown', handleKeyDown);

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab panel
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // Character select buttons
    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            gameState.selectedCharacter = btn.dataset.char;
            createCharacter(gameState.selectedCharacter);
            startGame();
        });
    });

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // Menu button (on game over screen)
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.getElementById('gameover-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
            updateLeaderboard();
        });
    }

    // Clear scores button
    const clearBtn = document.getElementById('clear-scores-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            localStorage.removeItem('runFromJusticeLeaderboard');
            updateLeaderboard();
        });
    }

    // Settings controls
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? 'ON' : 'OFF';
        });
    });

    // Initialize leaderboard
    updateLeaderboard();
}

// Leaderboard functions
function updateLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('runFromJusticeLeaderboard') || '[]');
    for (let i = 0; i < 5; i++) {
        const scoreEl = document.getElementById('lb-score-' + (i + 1));
        const distEl = document.getElementById('lb-dist-' + (i + 1));
        if (scoreEl && distEl) {
            if (scores[i]) {
                scoreEl.textContent = scores[i].score.toLocaleString();
                distEl.textContent = Math.floor(scores[i].distance) + 'm';
            } else {
                scoreEl.textContent = '---';
                distEl.textContent = '---';
            }
        }
    }
}

function saveToLeaderboard(score, distance) {
    const scores = JSON.parse(localStorage.getItem('runFromJusticeLeaderboard') || '[]');
    scores.push({ score, distance });
    scores.sort((a, b) => b.score - a.score);
    scores.splice(5); // Keep top 5
    localStorage.setItem('runFromJusticeLeaderboard', JSON.stringify(scores));
}

function handleKeyDown(e) {
    if (!gameState.isRunning) return;

    switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
            if (gameState.currentLane > -1 && !isChangingLane()) {
                changeLane(-1);
            }
            break;
        case 'KeyD':
        case 'ArrowRight':
            if (gameState.currentLane < 1 && !isChangingLane()) {
                changeLane(1);
            }
            break;
        case 'KeyW':
        case 'ArrowUp':
        case 'Space':
            if (!gameState.isJumping && !gameState.isSliding) {
                jump();
            }
            e.preventDefault();
            break;
        case 'KeyS':
        case 'ArrowDown':
        case 'ShiftLeft':
        case 'ShiftRight':
            if (!gameState.isJumping && !gameState.isSliding) {
                slide();
            }
            break;
        case 'Escape':
            togglePause();
            break;
    }
}

function isChangingLane() {
    return gameState.targetLane !== gameState.currentLane;
}

function changeLane(direction) {
    gameState.targetLane = gameState.currentLane + direction;
    gameState.laneChangeStartTime = performance.now();
    gameState.laneChangeStartPos = character.position.x;
    AudioSystem.playLaneChange();
}

function jump() {
    gameState.isJumping = true;
    gameState.jumpStartTime = performance.now();
    AudioSystem.playJumpSound();
}

function slide() {
    gameState.isSliding = true;
    gameState.slideStartTime = performance.now();
    AudioSystem.playSlideSound();
}

function togglePause() {
    if (!gameState.isRunning) return;
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pause-indicator').classList.toggle('hidden', !gameState.isPaused);
}

// ============================================
// GAME LOOP - Optimized for Smoothness
// ============================================
let lastTime = 0;
const targetFPS = 60;
const targetFrameTime = 1000 / targetFPS;

function animate(currentTime = 0) {
    requestAnimationFrame(animate);

    if (!gameState.isRunning || gameState.isPaused) {
        renderer.render(scene, camera);
        return;
    }

    // Calculate delta time with smoothing
    const rawDelta = currentTime - lastTime;
    lastTime = currentTime;

    // Clamp delta to prevent huge jumps (e.g., when tab is inactive)
    const deltaTime = Math.min(rawDelta, targetFrameTime * 3);
    const deltaMultiplier = deltaTime / targetFrameTime;

    // Update game speed (gradually increase)
    gameState.speed = Math.min(gameState.speed + CONFIG.speedIncrease * deltaMultiplier, CONFIG.maxSpeed);

    // Move everything towards player (smooth with delta)
    const moveAmount = gameState.speed * deltaMultiplier;

    tiles.forEach(tile => {
        tile.position.z += moveAmount;
    });

    // Move elPresidente (chaser)
    elPresidente.position.z += moveAmount * CONFIG.chaserSpeedMultiplier;

    // Update distance
    gameState.distance += moveAmount * CONFIG.distanceMultiplier;

    // Update difficulty based on distance
    updateDifficulty();

    // Update environment based on distance
    updateEnvironment();

    // Update character
    updateCharacter(currentTime);

    // Animate character running
    animateCharacter(currentTime);

    // Animate chaser
    animateChaser(currentTime);

    // Check collisions
    checkCollisions();

    // Collect money
    collectMoney();

    // Collect kids
    collectKids();

    // Generate new tiles and remove old ones
    manageTiles();

    // Update score
    updateScore();

    // Update HUD
    updateHUD();

    // Animate money
    animateMoney(currentTime);

    // Animate kids
    animateKids(currentTime);

    renderer.render(scene, camera);
}

function updateCharacter(currentTime) {
    // Lane change
    if (gameState.targetLane !== gameState.currentLane) {
        const elapsed = currentTime - gameState.laneChangeStartTime;
        const progress = Math.min(elapsed / CONFIG.laneChangeDuration, 1);
        const eased = easeOutCubic(progress);

        const targetX = gameState.targetLane * CONFIG.laneWidth;
        character.position.x = gameState.laneChangeStartPos + (targetX - gameState.laneChangeStartPos) * eased;

        character.rotation.z = (gameState.targetLane - gameState.currentLane) * -0.2 * (1 - progress);

        if (progress >= 1) {
            gameState.currentLane = gameState.targetLane;
            character.rotation.z = 0;
        }
    }

    // Jump
    if (gameState.isJumping) {
        const elapsed = currentTime - gameState.jumpStartTime;
        const progress = elapsed / CONFIG.jumpDuration;

        if (progress < 1) {
            const height = Math.sin(progress * Math.PI) * CONFIG.jumpHeight;
            character.position.y = height;
        } else {
            character.position.y = 0;
            gameState.isJumping = false;
        }
    }

    // Slide
    if (gameState.isSliding) {
        const elapsed = currentTime - gameState.slideStartTime;

        if (elapsed < CONFIG.slideDuration) {
            character.scale.y = 0.5;
            character.position.y = -0.5;
        } else {
            character.scale.y = 1;
            character.position.y = 0;
            gameState.isSliding = false;
        }
    }
}

function animateCharacter(time) {
    const runCycle = Math.sin(time * 0.015) * 0.5;

    if (!gameState.isJumping && !gameState.isSliding) {
        if (character.leftArm && character.rightArm) {
            character.leftArm.rotation.x = runCycle;
            character.rightArm.rotation.x = -runCycle;
        }

        if (character.leftLeg && character.rightLeg) {
            character.leftLeg.rotation.x = -runCycle * 0.8;
            character.rightLeg.rotation.x = runCycle * 0.8;
        }
    } else if (gameState.isJumping) {
        if (character.leftArm && character.rightArm) {
            character.leftArm.rotation.x = -0.5;
            character.rightArm.rotation.x = -0.5;
        }
        if (character.leftLeg && character.rightLeg) {
            character.leftLeg.rotation.x = 0.3;
            character.rightLeg.rotation.x = -0.3;
        }
    }
}

function animateChaser(time) {
    const runCycle = Math.sin(time * 0.012) * 0.3;

    // Make elPresidente follow player's lane
    const targetX = gameState.currentLane * CONFIG.laneWidth;
    elPresidente.position.x += (targetX - elPresidente.position.x) * 0.02;

    // Arm swing (aggressive reaching)
    if (elPresidente.leftArm && elPresidente.rightArm) {
        elPresidente.leftArm.rotation.x = runCycle - 0.3;
        elPresidente.rightArm.rotation.x = -runCycle - 0.3;
    }

    // Leg movement
    if (elPresidente.leftLeg && elPresidente.rightLeg) {
        elPresidente.leftLeg.rotation.x = -runCycle * 0.5;
        elPresidente.rightLeg.rotation.x = runCycle * 0.5;
    }

    // Bobbing
    elPresidente.position.y = Math.sin(time * 0.01) * 0.3;

    // Scale up when close
    if (elPresidente.position.z < 10) {
        elPresidente.scale.setScalar(1 + (10 - elPresidente.position.z) * 0.02);
    } else {
        elPresidente.scale.setScalar(1);
    }

    // Scepter glow effect when close
    if (elPresidente.scepter && elPresidente.position.z < 12) {
        // Make scepter bob menacingly
        elPresidente.scepter.rotation.z = Math.sin(time * 0.02) * 0.1;
    }

    // Update chaser distance in HUD
    const chaserDist = Math.max(0, Math.floor(elPresidente.position.z));
    document.getElementById('chaser-dist').textContent = chaserDist;

    // Update danger bar (inverse of distance - closer = more danger)
    const dangerPercent = Math.min(100, Math.max(0, (15 - elPresidente.position.z) / 15 * 100));
    document.getElementById('danger-fill').style.width = dangerPercent + '%';

    // Pulse the chaser distance display when danger is high
    const chaserDisplay = document.getElementById('chaser-distance');
    if (dangerPercent > 70) {
        chaserDisplay.style.animation = 'introFlash 0.3s ease-in-out infinite alternate';
    } else {
        chaserDisplay.style.animation = 'none';
    }
}

function animateMoney(time) {
    moneyItems.forEach(money => {
        if (!money.collected) {
            money.rotation.y = time * 0.003;
            money.rotation.x = Math.sin(time * 0.002) * 0.1;
        }
    });
}

function checkCollisions() {
    const charLane = gameState.currentLane;
    const charZ = 0;
    const charY = character.position.y;

    obstacles.forEach(obstacle => {
        if (!obstacle.hit) {
            const obsZ = obstacle.parent.position.z + obstacle.position.z;
            const obsLane = obstacle.lane;

            if (Math.abs(obsZ - charZ) < 2 && obsLane === charLane) {
                if (obstacle.type === 'barrier_low' || obstacle.type === 'trash') {
                    if (charY < obstacle.height) {
                        gameOver('obstacle');
                    }
                } else if (obstacle.type === 'tape') {
                    if (!gameState.isSliding) {
                        gameOver('obstacle');
                    }
                } else if (obstacle.type === 'car') {
                    gameOver('obstacle');
                }
            }
        }
    });

    // Check if elPresidente caught up
    if (elPresidente.position.z < CONFIG.elPresidenteCatchDistance) {
        gameOver('caught');
    }
}

function collectMoney() {
    const charLane = gameState.currentLane;
    const charY = character.position.y;

    moneyItems.forEach(money => {
        if (!money.collected) {
            const moneyZ = money.parent.position.z + money.position.z;
            const moneyX = money.position.x;
            const moneyY = money.position.y;
            const moneyLane = Math.round(moneyX / CONFIG.laneWidth);

            if (Math.abs(moneyZ) < 2 && moneyLane === charLane && Math.abs(moneyY - charY - 1.5) < 2) {
                money.collected = true;
                money.visible = false;
                gameState.money++;

                flashMoneyCollect();
            }
        }
    });
}

function flashMoneyCollect() {
    const moneyDisplay = document.getElementById('coins-display');
    moneyDisplay.style.transform = 'scale(1.2)';
    AudioSystem.playCoinSound();
    setTimeout(() => {
        moneyDisplay.style.transform = 'scale(1)';
    }, 100);
}

function collectKids() {
    const charLane = gameState.currentLane;
    const charY = character.position.y;
    const charX = character.position.x;

    kidItems.forEach(kid => {
        if (!kid.collected && kid.parent) {
            const kidZ = kid.parent.position.z + kid.position.z;
            const kidX = kid.position.x;

            // Kids move toward player when nearby (like magnetism)
            if (kidZ > -10 && kidZ < 10) {
                // Move kid toward player's lane
                const targetX = charX;
                kid.position.x += (targetX - kid.position.x) * 0.05;
            }

            // Check collection
            if (Math.abs(kidZ) < 2 && Math.abs(kidX - charX) < 2) {
                kid.collected = true;
                kid.visible = false;
                gameState.kids++;

                flashKidsCollect();
            }
        }
    });
}

function flashKidsCollect() {
    const kidsDisplay = document.getElementById('kids-display');
    kidsDisplay.style.transform = 'scale(1.3)';
    kidsDisplay.style.boxShadow = '0 0 30px rgba(255, 100, 255, 0.8)';
    setTimeout(() => {
        kidsDisplay.style.transform = 'scale(1)';
        kidsDisplay.style.boxShadow = '0 0 20px rgba(255, 100, 255, 0.3)';
    }, 150);
}

function animateKids(time) {
    kidItems.forEach(kid => {
        if (!kid.collected && kid.parent) {
            // Bounce animation
            kid.position.y = 0.8 + Math.sin(time * 0.005 + kid.worldZ) * 0.2;
            // Slight rotation
            kid.rotation.y = Math.sin(time * 0.002 + kid.worldZ) * 0.3;
        }
    });
}

function manageTiles() {
    tiles = tiles.filter(tile => {
        if (tile.position.z > 50) {
            scene.remove(tile);
            return false;
        }
        return true;
    });

    obstacles = obstacles.filter(obs => obs.parent && obs.parent.parent === scene);
    moneyItems = moneyItems.filter(m => m.parent && m.parent.parent === scene);
    kidItems = kidItems.filter(k => k.parent && k.parent.parent === scene);

    while (tiles.length < CONFIG.visibleTiles) {
        generateTile();
    }
}

function updateScore() {
    gameState.score = Math.floor(gameState.distance * 10) +
        (gameState.money * CONFIG.moneyValue) +
        (gameState.kids * CONFIG.kidsValue);
}

function updateHUD() {
    document.getElementById('coin-count').textContent = gameState.money;
    document.getElementById('kids-count').textContent = gameState.kids;
    document.getElementById('distance').textContent = Math.floor(gameState.distance);
    document.getElementById('score').textContent = gameState.score;
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// ============================================
// DIFFICULTY & ENVIRONMENT PROGRESSION
// ============================================
function updateDifficulty() {
    const distance = gameState.distance;

    // Increase obstacle frequency based on distance
    // Start at 0.4, max out at 0.8 at 2000m
    CONFIG.obstacleFrequency = Math.min(0.4 + (distance / 5000), 0.8);

    // Chaser gets faster the further you go
    // Start at 0.983, decrease to 0.95 at 2000m (faster catch-up)
    CONFIG.chaserSpeedMultiplier = Math.max(0.983 - (distance / 40000), 0.95);

    // Increase max speed gradually
    CONFIG.maxSpeed = Math.min(2.5 + (distance / 1500), 4.0);

    // Speed increases faster as you progress
    CONFIG.speedIncrease = 0.0007 + (distance / 500000);
}

function updateEnvironment() {
    const distance = gameState.distance;
    let envIndex = 0;

    // Determine which environment based on distance
    if (distance >= 2000) envIndex = 4;      // Border
    else if (distance >= 1500) envIndex = 3; // Airport
    else if (distance >= 1000) envIndex = 2; // Industrial
    else if (distance >= 500) envIndex = 1;  // Highway
    else envIndex = 0;                        // City Night

    // Only update if environment changed
    if (envIndex !== gameState.currentEnvironment) {
        gameState.currentEnvironment = envIndex;
        const env = ENVIRONMENTS[envIndex];

        // Smoothly transition scene colors
        scene.background = new THREE.Color(env.sky);
        scene.fog.color = new THREE.Color(env.fog);

        // Show environment name briefly
        showEnvironmentName(env.name);
    }
}

function showEnvironmentName(name) {
    // Create or update environment indicator
    let indicator = document.getElementById('env-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'env-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: 'Orbitron', sans-serif;
            font-size: 14px;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.getElementById('game-container').appendChild(indicator);
    }

    indicator.textContent = `ðŸ“ ${name}`;
    indicator.style.opacity = '1';

    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');

    // Resume audio context (required after user interaction)
    AudioSystem.resume();
    AudioSystem.playMusic();

    // Show intro animation
    playIntroAnimation(() => {
        resetGameState();
        gameState.isRunning = true;
        lastTime = performance.now();
    });
}

function playIntroAnimation(callback) {
    const introEl = document.getElementById('intro-animation');
    const textEl = document.getElementById('intro-text');

    // Quick intro - just 0.6 seconds
    introEl.classList.remove('hidden');
    textEl.textContent = "RUN!";

    // Position elPresidente close
    elPresidente.position.z = 8;
    elPresidente.position.x = 0;
    elPresidente.scale.setScalar(1.3);
    if (elPresidente.shotgunFlash) elPresidente.shotgunFlash.visible = true;

    // Character ready
    character.position.set(0, 0, 0);
    character.rotation.set(0, 0, 0);

    // Camera shows both elPresidente and player
    camera.position.set(0, 12, 22);
    camera.lookAt(0, 2, 0);

    renderer.render(scene, camera);

    // Quick animation - camera settles and game starts
    setTimeout(() => {
        introEl.classList.add('hidden');
        if (elPresidente.shotgunFlash) elPresidente.shotgunFlash.visible = false;
        elPresidente.position.z = CONFIG.elPresidenteDistance;
        elPresidente.scale.setScalar(1);
        camera.position.set(0, 10, 20);
        callback();
    }, 600);
}

function restartGame() {
    document.getElementById('gameover-screen').classList.add('hidden');

    // Clear existing tiles
    tiles.forEach(tile => scene.remove(tile));
    tiles = [];
    obstacles = [];
    moneyItems = [];
    kidItems = [];
    nextTileZ = 0;

    // Regenerate path
    for (let i = 0; i < CONFIG.visibleTiles; i++) {
        generateTile();
    }

    // Reset elPresidente position
    elPresidente.position.z = CONFIG.elPresidenteDistance;
    elPresidente.position.x = 0;
    elPresidente.scale.setScalar(1);

    // Recreate character
    createCharacter(gameState.selectedCharacter);

    resetGameState();
    gameState.isRunning = true;
    lastTime = performance.now();
}

function resetGameState() {
    gameState.score = 0;
    gameState.money = 0;
    gameState.kids = 0;
    gameState.distance = 0;
    gameState.speed = CONFIG.initialSpeed;
    gameState.currentLane = 0;
    gameState.targetLane = 0;
    gameState.isJumping = false;
    gameState.isSliding = false;
    gameState.isPaused = false;
    gameState.currentEnvironment = 0;

    // Reset difficulty to initial values
    CONFIG.obstacleFrequency = 0.4;
    CONFIG.elPresidenteSpeedMultiplier = 0.983;
    CONFIG.maxSpeed = 2.5;
    CONFIG.speedIncrease = 0.0007;

    // Reset scene colors to city night
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog.color = new THREE.Color(0x0a0a1a);

    if (character) {
        character.position.set(0, 0, 0);
        character.rotation.set(0, 0, 0);
        character.scale.set(1, 1, 1);
    }

    // Restart music
    AudioSystem.resume();
    AudioSystem.playMusic();

    updateHUD();
}

const CAUGHT_MESSAGES = [
    "El Presidente has caught you!",
    "No one escapes the regime!",
    "To the dungeon with you!",
    "The chase is over!",
    "Resistance is futile!",
    "Another escapee captured!",
];

function gameOver(reason = 'obstacle') {
    gameState.isRunning = false;
    AudioSystem.stopMusic();

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('runFromJusticeHighScore', gameState.highScore);
    }

    // Dramatic catch animation
    if (reason === 'caught') {
        // Show dramatic catch sequence
        AudioSystem.playCaughtSound();
        playCatchAnimation();
    } else {
        // Just tripped - elPresidente catches up
        AudioSystem.playCrashSound();
        document.getElementById('caught-text').textContent = "You tripped! elPresidente caught up!";

        setTimeout(() => {
            document.getElementById('gameover-screen').classList.remove('hidden');
        }, 300);
    }

    document.getElementById('final-distance').textContent = Math.floor(gameState.distance);
    document.getElementById('final-coins').textContent = gameState.money;
    document.getElementById('final-kids').textContent = gameState.kids;
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('high-score').textContent = gameState.highScore;

    // Save to leaderboard
    saveToLeaderboard(gameState.score, gameState.distance);
}

function playCatchAnimation() {
    // Step 1: elPresidente rushes forward
    elPresidente.position.z = 3;
    elPresidente.position.x = character.position.x;
    elPresidente.scale.setScalar(1.3);

    // Character reacts - falls back
    character.rotation.x = -0.8;
    character.position.y = 0.3;

    // Camera shake effect
    const originalCamPos = { x: camera.position.x, y: camera.position.y };
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
        camera.position.x = originalCamPos.x + (Math.random() - 0.5) * 0.5;
        camera.position.y = originalCamPos.y + (Math.random() - 0.5) * 0.3;
        shakeCount++;
        if (shakeCount > 10) {
            clearInterval(shakeInterval);
            camera.position.x = originalCamPos.x;
            camera.position.y = originalCamPos.y;
        }
    }, 50);

    // Step 2: elPresidente looms over (after 300ms)
    setTimeout(() => {
        elPresidente.position.z = 1;
        elPresidente.scale.setScalar(1.5);
        if (elPresidente.shotgunFlash) elPresidente.shotgunFlash.visible = false;

        // Character on ground
        character.rotation.x = -1.2;
        character.position.y = 0;
        character.rotation.z = 0.3;

        // Show dictator speech bubble
        showDictatorSpeech();
    }, 300);

    // Step 3: Set caught message
    setTimeout(() => {
        document.getElementById('caught-text').textContent =
            CAUGHT_MESSAGES[Math.floor(Math.random() * CAUGHT_MESSAGES.length)];
    }, 500);

    // Step 4: Show game over screen (after dramatic pause)
    setTimeout(() => {
        hideDictatorSpeech();
        document.getElementById('gameover-screen').classList.remove('hidden');
    }, 1800);
}

const DICTATOR_QUOTES = [
    "¡No escape!",
    "To the dungeon!",
    "You dare run?!",
    "CAPTURED!",
    "My guards never fail!",
    "Resistance is futile!",
    "¡Viva elPresidente!",
];

function showDictatorSpeech() {
    let bubble = document.getElementById('dictator-speech');
    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'dictator-speech';
        bubble.style.cssText = `
            position: fixed;
            top: 25%;
            left: 50%;
            transform: translateX(-50%);
            background: #2a4a2a;
            color: #ffd700;
            padding: 15px 25px;
            border-radius: 15px;
            font-family: 'Bebas Neue', sans-serif;
            font-size: 28px;
            z-index: 200;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 3px solid #ffd700;
            animation: dictatorPop 0.3s ease-out;
        `;

        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dictatorPop {
                0% { transform: translateX(-50%) scale(0); }
                50% { transform: translateX(-50%) scale(1.2); }
                100% { transform: translateX(-50%) scale(1); }
            }
        `;
        document.head.appendChild(style);

        document.getElementById('game-container').appendChild(bubble);
    }

    bubble.textContent = DICTATOR_QUOTES[Math.floor(Math.random() * DICTATOR_QUOTES.length)];
    bubble.style.display = 'block';
}

function hideDictatorSpeech() {
    const bubble = document.getElementById('dictator-speech');
    if (bubble) {
        bubble.style.display = 'none';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize game
init();
