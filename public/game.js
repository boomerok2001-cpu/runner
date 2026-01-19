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

    // Trump chaser - Balanced pressure
    trumpDistance: 11,
    trumpSpeedMultiplier: 0.983,
    trumpCatchDistance: 3,

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
};

// ============================================
// THREE.JS SETUP
// ============================================
let scene, camera, renderer;
let character, trump;
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

    // Camera - positioned higher to see Trump behind player
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

    // Lighting
    setupLighting();

    // Create Trump chaser
    createTrump();

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
// TRUMP CHASER CREATION
// ============================================
function createTrump() {
    trump = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 }); // Orange-ish skin
    const suitMat = new THREE.MeshLambertMaterial({ color: 0x1a1a4a }); // Navy suit
    const tieMat = new THREE.MeshLambertMaterial({ color: 0xcc0000 }); // Red tie
    const hairMat = new THREE.MeshLambertMaterial({ color: 0xffdd44 }); // Blonde/orange hair
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    // Larger body (intimidating)
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2.2, 1),
        suitMat
    );
    torso.position.y = 3;
    trump.add(torso);

    // Red tie
    const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.5, 0.1),
        tieMat
    );
    tie.position.set(0, 2.8, 0.55);
    trump.add(tie);

    // Head (larger)
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1),
        skinMat
    );
    head.position.y = 4.8;
    trump.add(head);

    // Iconic hair
    const hairTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.4, 1.2),
        hairMat
    );
    hairTop.position.y = 5.5;
    hairTop.position.z = -0.1;
    trump.add(hairTop);

    // Hair swoosh
    const hairSwoosh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.3, 0.4),
        hairMat
    );
    hairSwoosh.position.set(0.5, 5.3, 0.5);
    hairSwoosh.rotation.z = 0.3;
    trump.add(hairSwoosh);

    // Eyes (determined look)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x4488ff });

    const leftEyeWhite = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.1),
        eyeWhiteMat
    );
    leftEyeWhite.position.set(-0.25, 4.9, 0.55);
    trump.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.1),
        eyeWhiteMat
    );
    rightEyeWhite.position.set(0.25, 4.9, 0.55);
    trump.add(rightEyeWhite);

    const leftPupil = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.05),
        eyePupilMat
    );
    leftPupil.position.set(-0.25, 4.9, 0.6);
    trump.add(leftPupil);

    const rightPupil = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.05),
        eyePupilMat
    );
    rightPupil.position.set(0.25, 4.9, 0.6);
    trump.add(rightPupil);

    // Mouth (slight frown)
    const mouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.05),
        new THREE.MeshLambertMaterial({ color: 0xcc6666 })
    );
    mouth.position.set(0, 4.4, 0.55);
    trump.add(mouth);

    // Arms (reaching forward)
    const armGeo = new THREE.BoxGeometry(0.5, 1.8, 0.5);

    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-1.2, 2.5, 0.5);
    leftArm.rotation.x = -0.5;
    trump.add(leftArm);
    trump.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeo, suitMat);
    rightArm.position.set(1.2, 2.5, 0.5);
    rightArm.rotation.x = -0.5;
    trump.add(rightArm);
    trump.rightArm = rightArm;

    // Hands (holding shotgun)
    const handGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.8, 2.5, 1.5);
    trump.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.8, 2.5, 1.5);
    trump.add(rightHand);

    // SHOTGUN
    const shotgunGroup = new THREE.Group();

    // Barrel (dark metal)
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8),
        barrelMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 1.2;
    shotgunGroup.add(barrel);

    // Second barrel (double barrel shotgun)
    const barrel2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8),
        barrelMat
    );
    barrel2.rotation.x = Math.PI / 2;
    barrel2.position.set(0.18, 0, 1.2);
    shotgunGroup.add(barrel2);

    // Stock (wood)
    const stockMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
    const stock = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.3, 0.8),
        stockMat
    );
    stock.position.z = -0.4;
    shotgunGroup.add(stock);

    // Grip
    const grip = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.4, 0.2),
        stockMat
    );
    grip.position.set(0.05, -0.2, 0.1);
    grip.rotation.x = 0.3;
    shotgunGroup.add(grip);

    // Muzzle flash (glowing)
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const flash = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.3, 6),
        flashMat
    );
    flash.rotation.x = -Math.PI / 2;
    flash.position.z = 2.5;
    flash.visible = false; // Will animate
    shotgunGroup.add(flash);
    trump.shotgunFlash = flash;

    shotgunGroup.position.set(0, 2.5, 1);
    trump.add(shotgunGroup);
    trump.shotgun = shotgunGroup;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.6, 1.8, 0.5);

    const leftLeg = new THREE.Mesh(legGeo, suitMat);
    leftLeg.position.set(-0.5, 0.9, 0);
    trump.add(leftLeg);
    trump.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeo, suitMat);
    rightLeg.position.set(0.5, 0.9, 0);
    trump.add(rightLeg);
    trump.rightLeg = rightLeg;

    // Add a red glow behind Trump (dramatic effect)
    const trumpGlow = new THREE.PointLight(0xff4444, 0.8, 20);
    trumpGlow.position.set(0, 3, -2);
    trump.add(trumpGlow);

    trump.position.set(0, 0, CONFIG.trumpDistance);
    scene.add(trump);
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
    const buildingColors = [0x3a3a4a, 0x4a4a5a, 0x2a2a3a, 0x5a5a6a];

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
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
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
}

function jump() {
    gameState.isJumping = true;
    gameState.jumpStartTime = performance.now();
}

function slide() {
    gameState.isSliding = true;
    gameState.slideStartTime = performance.now();
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

    // Move Trump (chaser)
    trump.position.z += moveAmount * CONFIG.trumpSpeedMultiplier;

    // Update distance
    gameState.distance += moveAmount * CONFIG.distanceMultiplier;

    // Update character
    updateCharacter(currentTime);

    // Animate character running
    animateCharacter(currentTime);

    // Animate Trump
    animateTrump(currentTime);

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

function animateTrump(time) {
    const runCycle = Math.sin(time * 0.012) * 0.3;

    // Make Trump follow player's lane
    const targetX = gameState.currentLane * CONFIG.laneWidth;
    trump.position.x += (targetX - trump.position.x) * 0.02;

    // Arm swing (aggressive reaching)
    if (trump.leftArm && trump.rightArm) {
        trump.leftArm.rotation.x = runCycle - 0.3;
        trump.rightArm.rotation.x = -runCycle - 0.3;
    }

    // Leg movement
    if (trump.leftLeg && trump.rightLeg) {
        trump.leftLeg.rotation.x = -runCycle * 0.5;
        trump.rightLeg.rotation.x = runCycle * 0.5;
    }

    // Bobbing
    trump.position.y = Math.sin(time * 0.01) * 0.3;

    // Scale up when close
    if (trump.position.z < 10) {
        trump.scale.setScalar(1 + (10 - trump.position.z) * 0.02);
    } else {
        trump.scale.setScalar(1);
    }

    // Shotgun flash effect (random shots when close)
    if (trump.shotgunFlash && trump.position.z < 12) {
        if (Math.random() < 0.02) { // 2% chance per frame
            trump.shotgunFlash.visible = true;
            trump.shotgunFlash.scale.setScalar(0.5 + Math.random());
            setTimeout(() => {
                if (trump.shotgunFlash) trump.shotgunFlash.visible = false;
            }, 50);
        }
    }

    // Update Trump distance in HUD
    const trumpDist = Math.max(0, Math.floor(trump.position.z));
    document.getElementById('trump-dist').textContent = trumpDist;

    // Update danger bar (inverse of distance - closer = more danger)
    const dangerPercent = Math.min(100, Math.max(0, (15 - trump.position.z) / 15 * 100));
    document.getElementById('danger-fill').style.width = dangerPercent + '%';

    // Pulse the trump distance display when danger is high
    const trumpDisplay = document.getElementById('trump-distance');
    if (dangerPercent > 70) {
        trumpDisplay.style.animation = 'introFlash 0.3s ease-in-out infinite alternate';
    } else {
        trumpDisplay.style.animation = 'none';
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

    // Check if Trump caught up
    if (trump.position.z < CONFIG.trumpCatchDistance) {
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
// GAME STATE MANAGEMENT
// ============================================
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');

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

    // Position Trump close
    trump.position.z = 8;
    trump.position.x = 0;
    trump.scale.setScalar(1.3);
    if (trump.shotgunFlash) trump.shotgunFlash.visible = true;

    // Character ready
    character.position.set(0, 0, 0);
    character.rotation.set(0, 0, 0);

    // Camera shows both Trump and player
    camera.position.set(0, 12, 22);
    camera.lookAt(0, 2, 0);

    renderer.render(scene, camera);

    // Quick animation - camera settles and game starts
    setTimeout(() => {
        introEl.classList.add('hidden');
        if (trump.shotgunFlash) trump.shotgunFlash.visible = false;
        trump.position.z = CONFIG.trumpDistance;
        trump.scale.setScalar(1);
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

    // Reset Trump position
    trump.position.z = CONFIG.trumpDistance;
    trump.position.x = 0;
    trump.scale.setScalar(1);

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

    if (character) {
        character.position.set(0, 0, 0);
        character.rotation.set(0, 0, 0);
        character.scale.set(1, 1, 1);
    }

    updateHUD();
}

const CAUGHT_MESSAGES = [
    "You're fired... and arrested!",
    "Justice has been served!",
    "No one escapes the law!",
    "Make America Arrest Again!",
    "The chase is over!",
    "Caught red-handed!",
];

function gameOver(reason = 'obstacle') {
    gameState.isRunning = false;

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('runFromJusticeHighScore', gameState.highScore);
    }

    // Dramatic catch animation
    if (reason === 'caught') {
        // Show dramatic catch sequence
        playCatchAnimation();
    } else {
        // Just tripped - Trump catches up
        document.getElementById('caught-text').textContent = "You tripped! Trump caught up!";

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
    // Step 1: Trump rushes forward
    trump.position.z = 3;
    trump.position.x = character.position.x;
    trump.scale.setScalar(1.3);

    // Shotgun flash burst
    if (trump.shotgunFlash) {
        trump.shotgunFlash.visible = true;
        trump.shotgunFlash.scale.setScalar(2);
    }

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

    // Step 2: Trump looms over (after 300ms)
    setTimeout(() => {
        trump.position.z = 1;
        trump.scale.setScalar(1.5);
        if (trump.shotgunFlash) trump.shotgunFlash.visible = false;

        // Character on ground
        character.rotation.x = -1.2;
        character.position.y = 0;
        character.rotation.z = 0.3;
    }, 300);

    // Step 3: Set caught message
    setTimeout(() => {
        document.getElementById('caught-text').textContent =
            CAUGHT_MESSAGES[Math.floor(Math.random() * CAUGHT_MESSAGES.length)];
    }, 500);

    // Step 4: Show game over screen (after dramatic pause)
    setTimeout(() => {
        document.getElementById('gameover-screen').classList.remove('hidden');
    }, 1200);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize game
init();
