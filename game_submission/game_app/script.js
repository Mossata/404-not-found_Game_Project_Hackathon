// ===========================
// GAME CONFIGURATION
// ===========================

const CONFIG = {
    GRID_ROWS: 5,
    GRID_COLS: 9,
    TILE_SIZE: 70,
    
    // Money system
    STARTING_MONEY: 2500,
    INCOME_PER_SECOND: 50,
    INCOME_TICK_MS: 1000,
    
    // Defense costs
    DEFENSE_COSTS: {
        firebreak: 300,
        hose: 500,
        wall: 1000,
        sprinkler: 1500
    },
    
    // Game timing
    FIRE_SPAWN_INTERVAL: 8000,  // Spawn new fire every 8 seconds
    FIRE_MOVE_SPEED: 0.25,        // Base pixels per frame for smooth movement (~60fps)
    FIRE_SPEED_INCREASE_PER_WAVE_TIER: 0.1,  // Speed increase every 3 waves
    FIRE_SPREAD_INTERVAL: 12000, // Fire spreads sideways every 12 seconds
    FIRE_ATTACK_INTERVAL: 1000, // Fires attack defenses every 1 second
    HOSE_SHOOT_INTERVAL: 1500,  // Water hoses shoot every 1.5 seconds
    DEFENSE_BURN_DAMAGE_INTERVAL: 1500, // Defenses on fire take damage every second
    DEFENSE_BURN_DAMAGE: 0.15, // Damage per tick when on fire
    
    // Positions
    DRIVEWAY_ROW: 2, // Middle row (0-indexed, so row 2 of 5)
    FIRE_THRESHOLD_COL: 2, // When fire reaches column 2 (near house), income stops and escape blocked
    HOUSE_COL: 0, // House is at column 0
    
    // Sprite images (set to null if using emojis as fallback)
    USE_SPRITES: true, // Set to true when you have sprite images
    SPRITE_PATHS: {
        fireNormal: './assets/images/fire-normal.png',
        fireEmber: './assets/images/fire-ember.png',
        hose: './assets/images/hose.png',
        hoseOnFire: './assets/images/hose-on-fire.png',
        wall: './assets/images/wall.png',
        sprinkler: './assets/images/sprinkler.png',
        sprinklerOnFire: './assets/images/sprinkler-on-fire.png',
        house: './assets/images/house.png',
        waterDroplet: './assets/images/water-droplet.png',
        car: './assets/images/car.png'
    }
};

// Sprite images cache
const SPRITES = {
    fireNormal: null,
    fireEmber: null,
    hose: null,
    hoseOnFire: null,
    wall: null,
    sprinkler: null,
    sprinklerOnFire: null,
    house: null,
    waterDroplet: null,
    car: null
};

// ===========================
// GAME STATE
// ===========================

const gameState = {
    money: CONFIG.STARTING_MONEY,
    moneyEarned: 0,
    moneySpent: 0,
    incomeActive: true,
    waveNumber: 1,
    escapeAvailable: true,
    helicopterAvailable: false,  // Becomes true when fire crosses driveway
    helicopterUsed: false,       // Can only use once
    
    gameStartTime: null,
    lastWaveIncrease: 0,
    
    selectedDefense: null,
    
    // Grid data: 2D array [row][col]
    // null = empty, 'defense' = defense object, 'fire' = fire object
    grid: [],
    
    // Defense and fire arrays
    defenses: [],
    fires: [],
    waterShots: [], // Water projectiles from hoses
    
    // Timers
    incomeTimer: null,
    fireSpawnTimer: null,
    fireMoveTimer: null,
    fireSpreadTimer: null,
    hoseShootTimer: null,
    defenseBurnTimer: null, // Timer for burning defenses
    
    gameActive: false,
    gameOver: false
};

// Defense definitions
const DEFENSES = {
    firebreak: {
        name: 'Fire Break',
        icon: '',
        iconOnFire: '', // Fire breaks don't catch fire
        cost: 300,
        slowFactor: 3, // Slows fire significantly
        range: 0, // Only affects fires on the same tile
        health: Infinity, // Cannot be destroyed
        canCatchFire: false, // Cannot catch fire
        canExtinguish: false,
        isPassive: true // Passive defense - just sits there and slows
    },
    hose: {
        name: 'Water Hose',
        icon: '💧',
        iconOnFire: '💧🔥',
        cost: 500,
        slowFactor: 1, // No slow effect - only damages
        range: 3, // Can shoot 3 tiles ahead
        health: 3, // Takes 3 fire hits to destroy
        shootInterval: 1500, // Shoots every 1.5 seconds
        damage: 1, // Each shot does 1 damage (fires have 5 health)
        canCatchFire: true, // Can catch fire and become disabled
        canExtinguish: true // Can put out fires on other defenses
    },
    wall: {
        name: 'Fire Block',
        icon: '🧱',
        iconOnFire: '🧱', // Walls don't show fire (they're fireproof)
        cost: 1000,
        slowFactor: 1, // No slow effect
        range: 0,
        health: 10, // Takes 10 fire hits to destroy (buffed)
        canCatchFire: false, // Fire blocks don't catch fire!
        canExtinguish: false
    },
    sprinkler: {
        name: 'Sprinkler',
        icon: '🌧️',
        iconOnFire: '🌧️🔥',
        cost: 1500,
        slowFactor: 1, // No slow effect - only damages
        range: 2, // Affects 2x2 area
        health: 4, // Takes 4 fire hits to destroy (buffed)
        canCatchFire: true, // Can catch fire and become disabled
        canExtinguish: true // Can put out fires on other defenses
    }
};

// Fire type definitions
const FIRE_TYPES = {
    normal: {
        name: 'Normal Fire',
        icon: '🔥',
        canThrowEmbers: false,
        emberChance: 0
    },
    ember: {
        name: 'Ember Fire',
        icon: '🔥✨',
        canThrowEmbers: true,
        emberChance: 0.3, // 30% chance per move to throw ember
        emberRange: 1 // Can throw embers up to 3 tiles ahead
    }
};

// ===========================
// CANVAS SETUP
// ===========================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = CONFIG.GRID_COLS * CONFIG.TILE_SIZE;
canvas.height = CONFIG.GRID_ROWS * CONFIG.TILE_SIZE;

// ===========================
// SPRITE LOADING
// ===========================

function loadSprites() {
    if (!CONFIG.USE_SPRITES) return;
    
    Object.keys(CONFIG.SPRITE_PATHS).forEach(key => {
        const img = new Image();
        img.src = CONFIG.SPRITE_PATHS[key];
        img.onload = () => {
            SPRITES[key] = img;
            console.log(`Loaded sprite: ${key}`);
            
            // Update UI elements when sprites load
            updateUISprites();
        };
        img.onerror = () => {
            console.warn(`Failed to load sprite: ${key}, using emoji fallback`);
        };
    });
}

// Load sprites when page loads
loadSprites();

// Update UI elements to use sprites
function updateUISprites() {
    if (!CONFIG.USE_SPRITES) return;
    
    // Update house display
    const houseDisplay = document.querySelector('.house-display');
    if (houseDisplay && SPRITES.house) {
        houseDisplay.innerHTML = '';
        const houseImg = document.createElement('img');
        houseImg.src = SPRITES.house.src;
        houseImg.style.width = '120px';
        houseImg.style.height = '120px';
        houseImg.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))';
        houseImg.style.animation = 'pulse 3s ease-in-out infinite';
        houseDisplay.appendChild(houseImg);
    }
    
    // Update defense shop icons
    const hoseBtn = document.getElementById('buy-hose');
    if (hoseBtn && SPRITES.hose) {
        const iconDiv = hoseBtn.querySelector('.defense-icon');
        if (iconDiv) {
            iconDiv.innerHTML = '';
            const img = document.createElement('img');
            img.src = SPRITES.hose.src;
            img.style.width = '48px';
            img.style.height = '48px';
            iconDiv.appendChild(img);
        }
    }
    
    const wallBtn = document.getElementById('buy-wall');
    if (wallBtn && SPRITES.wall) {
        const iconDiv = wallBtn.querySelector('.defense-icon');
        if (iconDiv) {
            iconDiv.innerHTML = '';
            const img = document.createElement('img');
            img.src = SPRITES.wall.src;
            img.style.width = '48px';
            img.style.height = '48px';
            iconDiv.appendChild(img);
        }
    }
    
    const sprinklerBtn = document.getElementById('buy-sprinkler');
    if (sprinklerBtn && SPRITES.sprinkler) {
        const iconDiv = sprinklerBtn.querySelector('.defense-icon');
        if (iconDiv) {
            iconDiv.innerHTML = '';
            const img = document.createElement('img');
            img.src = SPRITES.sprinkler.src;
            img.style.width = '48px';
            img.style.height = '48px';
            iconDiv.appendChild(img);
        }
    }
    
    // Update car sprite (no label, just the car)
    const carSprite = document.getElementById('car-sprite');
    if (carSprite && SPRITES.car) {
        carSprite.innerHTML = '';
        const carImg = document.createElement('img');
        carImg.src = SPRITES.car.src;
        carImg.style.width = '60px';
        carImg.style.height = 'auto';
        carImg.style.verticalAlign = 'middle';
        carImg.style.display = 'inline-block';
        carSprite.appendChild(carImg);
    }
}

// Helper function to draw sprite or emoji
function drawSprite(spriteKey, emojisFallback, x, y, size = CONFIG.TILE_SIZE * 0.8) {
    if (CONFIG.USE_SPRITES && SPRITES[spriteKey]) {
        // Draw image sprite
        const img = SPRITES[spriteKey];
        ctx.drawImage(img, x - size/2, y - size/2, size, size);
    } else {
        // Draw emoji fallback
        ctx.fillText(emojisFallback, x, y);
    }
}

// ===========================
// SCREEN MANAGEMENT
// ===========================

const screens = {
    menu: document.getElementById('menu-screen'),
    play: document.getElementById('play-screen'),
    cutscene: document.getElementById('cutscene-screen'),
    results: document.getElementById('results-screen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// ===========================
// GAME INITIALIZATION
// ===========================

function initGame() {
    // Reset state
    gameState.money = CONFIG.STARTING_MONEY;
    gameState.moneyEarned = 0;
    gameState.moneySpent = 0;
    gameState.incomeActive = true;
    gameState.waveNumber = 1;
    gameState.escapeAvailable = true;
    gameState.helicopterAvailable = false;
    gameState.helicopterUsed = false;
    gameState.selectedDefense = null;
    gameState.defenses = [];
    gameState.fires = [];
    gameState.waterShots = [];
    gameState.gameActive = true;
    gameState.gameOver = false;
    gameState.gameStartTime = Date.now();
    gameState.lastWaveIncrease = 0;
    
    // Initialize grid
    gameState.grid = [];
    for (let row = 0; row < CONFIG.GRID_ROWS; row++) {
        gameState.grid[row] = [];
        for (let col = 0; col < CONFIG.GRID_COLS; col++) {
            gameState.grid[row][col] = null;
        }
    }
    
    // Update UI
    updateMoneyDisplay();
    updateWaveDisplay();
    updateEscapeStatus();
    updateIncomeStatus();
    updateHelicopterButton();
    
    // Reset car sprite (no label)
    const carSprite = document.getElementById('car-sprite');
    if (carSprite) {
        carSprite.classList.remove('leaving');
        // Re-apply car sprite if using sprites
        if (CONFIG.USE_SPRITES && SPRITES.car) {
            carSprite.innerHTML = '';
            const carImg = document.createElement('img');
            carImg.src = SPRITES.car.src;
            carImg.style.width = '60px';
            carImg.style.height = 'auto';
            carImg.style.verticalAlign = 'middle';
            carImg.style.display = 'inline-block';
            carSprite.appendChild(carImg);
        }
    }
    
    // Start game timers
    startGameTimers();
    
    // Start rendering
    requestAnimationFrame(gameLoop);
    
    console.log('Game initialized');
}

function startGameTimers() {
    // Clear any existing timers
    clearAllTimers();
    
    // Income timer (earn money each second)
    gameState.incomeTimer = setInterval(() => {
        if (gameState.incomeActive && gameState.gameActive) {
            gameState.money += CONFIG.INCOME_PER_SECOND;
            gameState.moneyEarned += CONFIG.INCOME_PER_SECOND;
            updateMoneyDisplay();
        }
    }, CONFIG.INCOME_TICK_MS);
    
    // Fire spawn timer (new fires appear)
    gameState.fireSpawnTimer = setInterval(() => {
        if (gameState.gameActive) {
            spawnFire();
        }
    }, CONFIG.FIRE_SPAWN_INTERVAL);
    
    // Fire movement is now handled in gameLoop (smooth pixel-based)
    // No longer need fire move timer
    
    // Fire spread timer (fires spread sideways)
    gameState.fireSpreadTimer = setInterval(() => {
        if (gameState.gameActive) {
            spreadFires();
        }
    }, CONFIG.FIRE_SPREAD_INTERVAL);
    
    // Water hose shooting timer
    gameState.hoseShootTimer = setInterval(() => {
        if (gameState.gameActive) {
            hosesShooting();
        }
    }, CONFIG.HOSE_SHOOT_INTERVAL);
    
    // Defense burning timer (defenses on fire take continuous damage)
    gameState.defenseBurnTimer = setInterval(() => {
        if (gameState.gameActive) {
            damageburningDefenses();
        }
    }, CONFIG.DEFENSE_BURN_DAMAGE_INTERVAL);
}

function clearAllTimers() {
    if (gameState.incomeTimer) clearInterval(gameState.incomeTimer);
    if (gameState.fireSpawnTimer) clearInterval(gameState.fireSpawnTimer);
    if (gameState.fireMoveTimer) clearInterval(gameState.fireMoveTimer);
    if (gameState.fireSpreadTimer) clearInterval(gameState.fireSpreadTimer);
    if (gameState.hoseShootTimer) clearInterval(gameState.hoseShootTimer);
    if (gameState.defenseBurnTimer) clearInterval(gameState.defenseBurnTimer);
}

// ===========================
// FIRE LOGIC
// ===========================

function spawnFire() {
    // Spawn fire at random row, rightmost column
    const row = Math.floor(Math.random() * CONFIG.GRID_ROWS);
    const col = CONFIG.GRID_COLS - 1;
    
    // Don't spawn if there's already fire here
    if (gameState.grid[row][col] && gameState.grid[row][col].type === 'fire') {
        return;
    }
    
    // Calculate fire stats based on wave (exponential scaling)
    const waveMultiplier = Math.floor((gameState.waveNumber - 1) / 3); // Increases every 3 waves
    const fireHealth = 5 + (waveMultiplier * 3); // +3 health every 3 waves
    
    // Determine fire type (30% chance for ember type after wave 3)
    let fireType = 'normal';
    if (gameState.waveNumber >= 3 && Math.random() < 0.2) {
        fireType = 'ember';
    }
    
    const fire = {
        type: 'fire',
        fireType: fireType,
        row: row,
        col: col,
        x: col * CONFIG.TILE_SIZE,  // Pixel position for smooth movement
        y: row * CONFIG.TILE_SIZE,  // Pixel position
        strength: gameState.waveNumber, // Fire gets stronger each wave
        health: fireHealth,
        maxHealth: fireHealth,
        lastMove: Date.now(),
        lastAttack: 0 // Track last time this fire attacked a defense
    };
    
    gameState.fires.push(fire);
    gameState.grid[row][col] = fire;
    
    const fireTypeIcon = FIRE_TYPES[fireType].icon;
    console.log(`${FIRE_TYPES[fireType].name} spawned at (${row}, ${col}) with ${fireHealth} health (Wave ${gameState.waveNumber})`);
    
    // Spawn multiple fires per wave as difficulty increases
    const extraSpawns = Math.floor(waveMultiplier / 2); // Every 6 waves, spawn 1 extra fire
    for (let i = 0; i < extraSpawns; i++) {
        const extraRow = Math.floor(Math.random() * CONFIG.GRID_ROWS);
        if (!gameState.grid[extraRow][col] || gameState.grid[extraRow][col].type !== 'fire') {
            // Extra fires can also be ember types
            let extraFireType = 'normal';
            if (gameState.waveNumber >= 3 && Math.random() < 0.3) {
                extraFireType = 'ember';
            }
            
            const extraFire = {
                type: 'fire',
                fireType: extraFireType,
                row: extraRow,
                col: col,
                x: col * CONFIG.TILE_SIZE,  // Pixel position for smooth movement
                y: extraRow * CONFIG.TILE_SIZE,  // Pixel position
                strength: gameState.waveNumber,
                health: fireHealth,
                maxHealth: fireHealth,
                lastMove: Date.now(),
                lastAttack: 0 // Track last time this fire attacked a defense
            };
            gameState.fires.push(extraFire);
            gameState.grid[extraRow][col] = extraFire;
            console.log(`Extra ${FIRE_TYPES[extraFireType].name} spawned at (${extraRow}, ${col})`);
        }
    }
}

function moveFires() {
    const firesToRemove = [];
    
    // Calculate wave-based speed multiplier (increases every 3 waves)
    const waveMultiplier = Math.floor((gameState.waveNumber - 1) / 3);
    const waveSpeedBonus = waveMultiplier * CONFIG.FIRE_SPEED_INCREASE_PER_WAVE_TIER;
    
    gameState.fires.forEach((fire, index) => {
        // Calculate fire speed: base speed + wave bonus / defense slow
        const slowFactor = getSlowFactorAt(fire.row, fire.col);
        const baseSpeed = CONFIG.FIRE_MOVE_SPEED + waveSpeedBonus;
        const moveSpeed = baseSpeed / slowFactor;
        
        // EMBER THROWING: Ember fires can spawn fires ahead (check every ~2 seconds)
        if (fire.fireType === 'ember' && FIRE_TYPES.ember.canThrowEmbers) {
            if (!fire.lastEmberThrow || Date.now() - fire.lastEmberThrow > 2000) {
                if (Math.random() < FIRE_TYPES.ember.emberChance) {
                    throwEmber(fire);
                    fire.lastEmberThrow = Date.now();
                }
            }
        }
        
        // Move fire left smoothly (pixel-based)
        fire.x -= moveSpeed;
        
        // Update grid column based on pixel position
        const newCol = Math.floor(fire.x / CONFIG.TILE_SIZE);
        
        // Check if fire has entered a new grid cell
        if (newCol !== fire.col && newCol >= 0) {
            // Clear old grid position
            if (gameState.grid[fire.row][fire.col] === fire) {
                gameState.grid[fire.row][fire.col] = null;
            }
            
            // Check if there's a defense in new cell
            if (gameState.grid[fire.row][newCol]) {
                const obstacle = gameState.grid[fire.row][newCol];
                if (obstacle.type === 'defense') {
                    const defenseInfo = DEFENSES[obstacle.defenseType];
                    
                    // FIRE BREAK: Passive defense - fire walks over it (gets slowed but doesn't stop)
                    if (obstacle.defenseType === 'firebreak') {
                        // Fire moves over the fire break, just gets slowed
                        fire.col = newCol;
                        // Don't set grid position - fire break stays in place, fire just passes through
                        return;
                    }
                    
                    // Attack the defense (only if not a fire break) - with cooldown timer
                    const now = Date.now();
                    if (!fire.lastAttack || now - fire.lastAttack >= CONFIG.FIRE_ATTACK_INTERVAL) {
                        obstacle.health--;
                        fire.lastAttack = now;
                        console.log(`Fire attacks defense at (${fire.row}, ${newCol}). Health: ${obstacle.health}`);
                        
                        // SET DEFENSE ON FIRE (if it can catch fire)
                        if (defenseInfo.canCatchFire && !obstacle.onFire) {
                            obstacle.onFire = true;
                            console.log(`${defenseInfo.name} at (${obstacle.row}, ${obstacle.col}) caught fire! 🔥`);
                        }
                    }
                    
                    if (obstacle.health <= 0) {
                        // Defense destroyed
                        gameState.grid[fire.row][newCol] = null;
                        gameState.defenses = gameState.defenses.filter(d => d !== obstacle);
                        console.log('Defense destroyed!');
                        
                        // Fire can now occupy this cell
                        fire.col = newCol;
                        gameState.grid[fire.row][newCol] = fire;
                    } else {
                        // Defense still alive - stop fire movement at edge of cell
                        fire.x = (newCol + 1) * CONFIG.TILE_SIZE - 1;
                        return; // Don't update column, stay in current cell
                    }
                } else {
                    // Update to new cell
                    fire.col = newCol;
                    gameState.grid[fire.row][newCol] = fire;
                }
            } else {
                // Empty cell - occupy it
                fire.col = newCol;
                gameState.grid[fire.row][newCol] = fire;
            }
        }
        
        // Check if fire reached the house (off left edge of canvas)
        if (fire.x < -CONFIG.TILE_SIZE) {
            console.log('Fire reached the house!');
            firesToRemove.push(index);
            endGame('house-destroyed');
            return;
        }
        
        // Check if fire reached threshold (stop income AND block escape)
        if (newCol <= CONFIG.FIRE_THRESHOLD_COL) {
            if (gameState.incomeActive) {
                gameState.incomeActive = false;
                updateIncomeStatus();
                console.log('Income stopped - fire too close!');
            }
            if (gameState.escapeAvailable) {
                gameState.escapeAvailable = false;
                updateEscapeStatus();
                console.log('Escape blocked - fire blocking driveway!');
            }
            // ENABLE HELICOPTER (gives false hope!)
            if (!gameState.helicopterAvailable && !gameState.helicopterUsed) {
                gameState.helicopterAvailable = true;
                updateHelicopterButton();
                console.log('🚁 HELICOPTER AVAILABLE - Last resort activated!');
            }
        }
    });
    
    // Remove fires that reached house
    firesToRemove.reverse().forEach(index => {
        gameState.fires.splice(index, 1);
    });
    
    // Increase wave difficulty every 20 seconds
    const timeElapsed = Date.now() - gameState.gameStartTime;
    const currentWaveLevel = Math.floor(timeElapsed / 20000); // Every 20 seconds
    if (currentWaveLevel > gameState.lastWaveIncrease) {
        gameState.waveNumber++;
        gameState.lastWaveIncrease = currentWaveLevel;
        updateWaveDisplay();
        console.log(`🔥 WAVE ${gameState.waveNumber} - Fire getting stronger!`);
    }
}

// Ember fires throw embers ahead to spawn new fires
function throwEmber(fire) {
    const emberRange = FIRE_TYPES.ember.emberRange;
    const targetCol = fire.col - Math.floor(Math.random() * emberRange) - 1; // 1-3 tiles ahead
    
    // Don't spawn embers too far left or on existing fires
    if (targetCol < 1 || targetCol >= fire.col) return;
    
    const targetRow = fire.row; // Same lane
    
    // Check if target is empty
    if (!gameState.grid[targetRow][targetCol]) {
        // Spawn new fire from ember
        const emberFire = {
            type: 'fire',
            fireType: 'normal', // Embers spawn normal fires
            row: targetRow,
            col: targetCol,
            x: targetCol * CONFIG.TILE_SIZE,  // Pixel position
            y: targetRow * CONFIG.TILE_SIZE,  // Pixel position
            strength: fire.strength,
            health: fire.health, // Same health as parent fire
            maxHealth: fire.maxHealth,
            lastMove: Date.now(),
            lastAttack: 0 // Track last time this fire attacked a defense
        };
        
        gameState.fires.push(emberFire);
        gameState.grid[targetRow][targetCol] = emberFire;
        console.log(`✨ Ember thrown! New fire at (${targetRow}, ${targetCol})`);
    }
}

// Defenses on fire take continuous damage
function damageburningDefenses() {
    gameState.defenses.forEach(defense => {
        if (defense.onFire) {
            defense.health -= CONFIG.DEFENSE_BURN_DAMAGE;
            
            if (defense.health <= 0) {
                // Defense burned down
                gameState.grid[defense.row][defense.col] = null;
                gameState.defenses = gameState.defenses.filter(d => d !== defense);
                console.log(`${DEFENSES[defense.defenseType].name} at (${defense.row}, ${defense.col}) burned down!`);
            }
        }
    });
}

function spreadFires() {
    const newFires = [];
    
    // Calculate spread chance based on wave (increases every 3 waves)
    const waveMultiplier = Math.floor((gameState.waveNumber - 1) / 3);
    const baseSpreadChance = 0.3;
    const spreadChance = Math.min(0.8, baseSpreadChance + (waveMultiplier * 0.15)); // Caps at 80%
    
    // Calculate fire health for new spreads
    const fireHealth = 5 + (waveMultiplier * 3);
    
    gameState.fires.forEach(fire => {
        // Increased chance to spread to adjacent row
        if (Math.random() < spreadChance) {
            const spreadDirection = Math.random() < 0.5 ? -1 : 1;
            const newRow = fire.row + spreadDirection;
            
            if (newRow >= 0 && newRow < CONFIG.GRID_ROWS) {
                // Check if tile is empty
                if (!gameState.grid[newRow][fire.col]) {
                    // Spread fires inherit fire type from parent
                    const newFire = {
                        type: 'fire',
                        fireType: fire.fireType, // Inherit type
                        row: newRow,
                        col: fire.col,
                        x: fire.col * CONFIG.TILE_SIZE,  // Pixel position
                        y: newRow * CONFIG.TILE_SIZE,  // Pixel position
                        strength: fire.strength,
                        health: fireHealth,
                        maxHealth: fireHealth,
                        lastMove: Date.now(),
                        lastAttack: 0 // Track last time this fire attacked a defense
                    };
                    
                    newFires.push(newFire);
                    gameState.grid[newRow][fire.col] = newFire;
                    console.log(`${FIRE_TYPES[fire.fireType].name} spread to (${newRow}, ${fire.col}) - Spread chance: ${(spreadChance * 100).toFixed(0)}%`);
                }
            }
        }
    });
    
    gameState.fires.push(...newFires);
}

// ===========================
// WATER HOSE SHOOTING
// ===========================

function hosesShooting() {
    // Find all water hoses and sprinklers and make them shoot
    gameState.defenses.forEach(defense => {
        const defenseInfo = DEFENSES[defense.defenseType];
        
        // DISABLED DEFENSES DON'T SHOOT (if on fire)
        if (defense.onFire) {
            return; // Can't shoot while on fire!
        }
        
        // Only hoses and sprinklers can shoot
        if (!defenseInfo.canExtinguish) {
            return;
        }
        
        if (defense.defenseType === 'hose') {
            // HOSE: Check if there's fire in range (same row, ahead of hose)
            let targetFire = null;
            let closestDistance = Infinity;
            
            gameState.fires.forEach(fire => {
                if (fire.row === defense.row && fire.col > defense.col) {
                    const distance = fire.col - defense.col;
                    if (distance <= DEFENSES.hose.range && distance < closestDistance) {
                        closestDistance = distance;
                        targetFire = fire;
                    }
                }
            });
            
            if (targetFire) {
                // Create water shot to attack fire
                const waterShot = {
                    type: 'hose',
                    target: 'fire',
                    row: defense.row,
                    col: defense.col,
                    targetRow: targetFire.row,
                    targetCol: targetFire.col,
                    speed: 0.3, // Moves 0.3 tiles per frame
                    position: defense.col,
                    positionRow: defense.row
                };
                
                gameState.waterShots.push(waterShot);
                console.log(`Hose at (${defense.row}, ${defense.col}) shoots at fire at (${targetFire.row}, ${targetFire.col})`);
            } else {
                // No fire in range, check for burning defenses in range
                let targetDefense = null;
                let closestDefDistance = Infinity;
                
                gameState.defenses.forEach(otherDefense => {
                    if (otherDefense.onFire && otherDefense !== defense) {
                        if (otherDefense.row === defense.row && otherDefense.col > defense.col) {
                            const distance = otherDefense.col - defense.col;
                            if (distance <= DEFENSES.hose.range && distance < closestDefDistance) {
                                closestDefDistance = distance;
                                targetDefense = otherDefense;
                            }
                        }
                    }
                });
                
                if (targetDefense) {
                    // Create water shot to extinguish burning defense
                    const waterShot = {
                        type: 'hose',
                        target: 'defense',
                        row: defense.row,
                        col: defense.col,
                        targetRow: targetDefense.row,
                        targetCol: targetDefense.col,
                        speed: 0.3,
                        position: defense.col,
                        positionRow: defense.row
                    };
                    
                    gameState.waterShots.push(waterShot);
                    console.log(`Hose at (${defense.row}, ${defense.col}) extinguishes defense at (${targetDefense.row}, ${targetDefense.col})`);
                }
            }
        } else if (defense.defenseType === 'sprinkler') {
            // SPRINKLER: Shoot at all fires within 2x2 range
            gameState.fires.forEach(fire => {
                const rowDist = Math.abs(defense.row - fire.row);
                const colDist = Math.abs(defense.col - fire.col);
                
                if (rowDist <= 1 && colDist <= 1) {
                    // Fire is in range, shoot at it
                    const waterShot = {
                        type: 'sprinkler',
                        target: 'fire',
                        row: defense.row,
                        col: defense.col,
                        targetRow: fire.row,
                        targetCol: fire.col,
                        speed: 0.2, // Slower than hose
                        position: defense.col,
                        positionRow: defense.row
                    };
                    
                    gameState.waterShots.push(waterShot);
                }
            });
            
            // SPRINKLER: Also extinguish burning defenses in range
            gameState.defenses.forEach(otherDefense => {
                if (otherDefense.onFire && otherDefense !== defense) {
                    const rowDist = Math.abs(defense.row - otherDefense.row);
                    const colDist = Math.abs(defense.col - otherDefense.col);
                    
                    if (rowDist <= 1 && colDist <= 1) {
                        // Burning defense in range, shoot at it
                        const waterShot = {
                            type: 'sprinkler',
                            target: 'defense',
                            row: defense.row,
                            col: defense.col,
                            targetRow: otherDefense.row,
                            targetCol: otherDefense.col,
                            speed: 0.2,
                            position: defense.col,
                            positionRow: defense.row
                        };
                        
                        gameState.waterShots.push(waterShot);
                    }
                }
            });
        }
    });
}

function updateWaterShots() {
    const shotsToRemove = [];
    
    gameState.waterShots.forEach((shot, index) => {
        // Calculate direction to target
        const deltaCol = shot.targetCol - shot.col;
        const deltaRow = shot.targetRow - shot.row;
        const distance = Math.sqrt(deltaCol * deltaCol + deltaRow * deltaRow);
        
        if (distance > 0) {
            // Move toward target
            const moveCol = (deltaCol / distance) * shot.speed;
            const moveRow = (deltaRow / distance) * shot.speed;
            
            shot.position += moveCol;
            shot.positionRow += moveRow;
        }
        
        // Check if water reached target
        const currentCol = Math.round(shot.position);
        const currentRow = Math.round(shot.positionRow);
        
        if (Math.abs(currentCol - shot.targetCol) <= 0.5 && Math.abs(currentRow - shot.targetRow) <= 0.5) {
            if (shot.target === 'fire') {
                // Check if there's still fire at this position
                const fireAtTarget = gameState.fires.find(f => f.row === currentRow && f.col === currentCol);
                
                if (fireAtTarget) {
                    // Damage the fire
                    fireAtTarget.health -= DEFENSES.hose.damage;
                    
                    if (fireAtTarget.health <= 0) {
                        // Fire extinguished completely
                        gameState.grid[fireAtTarget.row][fireAtTarget.col] = null;
                        gameState.fires = gameState.fires.filter(f => f !== fireAtTarget);
                        console.log(`Water extinguished fire at (${currentRow}, ${currentCol})`);
                    } else {
                        console.log(`Water damaged fire at (${currentRow}, ${currentCol}). Health: ${fireAtTarget.health}/${fireAtTarget.maxHealth}`);
                    }
                }
            } else if (shot.target === 'defense') {
                // Check if there's a burning defense at this position
                const defenseAtTarget = gameState.defenses.find(d => d.row === currentRow && d.col === currentCol && d.onFire);
                
                if (defenseAtTarget) {
                    // Extinguish the defense!
                    defenseAtTarget.onFire = false;
                    console.log(`💧 Water extinguished ${DEFENSES[defenseAtTarget.defenseType].name} at (${currentRow}, ${currentCol})! Defense restored.`);
                }
            }
            
            // Remove water shot
            shotsToRemove.push(index);
        }
        
        // Remove if water went too far
        if (shot.position > CONFIG.GRID_COLS || shot.position < -1 || 
            shot.positionRow > CONFIG.GRID_ROWS || shot.positionRow < -1) {
            shotsToRemove.push(index);
        }
    });
    
    // Remove finished shots
    shotsToRemove.reverse().forEach(index => {
        gameState.waterShots.splice(index, 1);
    });
}

function getSlowFactorAt(row, col) {
    let slowFactor = 1;
    
    // Check for fire break defenses on this exact tile (they slow fires)
    gameState.defenses.forEach(defense => {
        if (defense.defenseType === 'firebreak' && defense.row === row && defense.col === col) {
            slowFactor = Math.max(slowFactor, DEFENSES.firebreak.slowFactor);
            console.log(`Fire at (${row}, ${col}) slowed by fire break - slowFactor: ${slowFactor}`);
        }
    });
    
    return slowFactor;
}

// ===========================
// DEFENSE PLACEMENT
// ===========================

function selectDefense(defenseType) {
    if (gameState.money < DEFENSES[defenseType].cost) {
        updateGameMessage('Not enough money!');
        return;
    }
    
    gameState.selectedDefense = defenseType;
    
    // Update button states
    document.querySelectorAll('.defense-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-defense="${defenseType}"]`).classList.add('selected');
    
    updateGameMessage(`Click a tile to place ${DEFENSES[defenseType].name}`);
}

function clearDefenseSelection() {
    gameState.selectedDefense = null;
    document.querySelectorAll('.defense-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateGameMessage('Click a defense, then click a tile to place it.');
}

function placeDefense(row, col) {
    if (!gameState.selectedDefense) {
        updateGameMessage('Select a defense first!');
        return;
    }
    
    // Can't place on rightmost 2 columns (fire spawn area)
    if (col >= CONFIG.GRID_COLS - 2) {
        updateGameMessage('Cannot place defenses in fire spawn area!');
        return;
    }
    
    // Leftmost column is now available (house is outside grid)
    // No restriction on column 0 anymore
    
    // Check if tile is occupied
    if (gameState.grid[row][col]) {
        updateGameMessage('Tile already occupied!');
        return;
    }
    
    const defenseType = gameState.selectedDefense;
    const cost = DEFENSES[defenseType].cost;
    
    if (gameState.money < cost) {
        updateGameMessage('Not enough money!');
        return;
    }
    
    // Create defense
    const defense = {
        type: 'defense',
        defenseType: defenseType,
        row: row,
        col: col,
        health: DEFENSES[defenseType].health,
        icon: DEFENSES[defenseType].icon,
        onFire: false // All defenses start not on fire
    };
    
    gameState.defenses.push(defense);
    gameState.grid[row][col] = defense;
    gameState.money -= cost;
    gameState.moneySpent += cost;
    
    updateMoneyDisplay();
    updateGameMessage(`${DEFENSES[defenseType].name} placed!`);
    
    console.log(`Placed ${defenseType} at (${row}, ${col})`);
    
    // Clear selection
    clearDefenseSelection();
}

// ===========================
// CANVAS RENDERING
// ===========================

function gameLoop() {
    if (!gameState.gameActive) return;
    
    moveFires(); // Move fires smoothly every frame
    updateWaterShots(); // Update water projectiles
    drawGame();
    requestAnimationFrame(gameLoop);
}

function drawGame() {
    // Clear canvas - green grass background
    ctx.fillStyle = '#6aa84f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw DRIVEWAY at column 2 (third column from left) - road texture
    const drivewayCol = CONFIG.FIRE_THRESHOLD_COL;
    const drivewayX = drivewayCol * CONFIG.TILE_SIZE;
    
    // Dark asphalt road background
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(drivewayX, 0, CONFIG.TILE_SIZE, canvas.height);
    
    // Road stripes (dashed line down the middle)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(drivewayX + CONFIG.TILE_SIZE / 2, 0);
    ctx.lineTo(drivewayX + CONFIG.TILE_SIZE / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); // Reset to solid lines
    
    // Road edges
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drivewayX, 0);
    ctx.lineTo(drivewayX, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(drivewayX + CONFIG.TILE_SIZE, 0);
    ctx.lineTo(drivewayX + CONFIG.TILE_SIZE, canvas.height);
    ctx.stroke();
    
    // Draw grid lines (full grid now, no house column)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    
    for (let row = 0; row <= CONFIG.GRID_ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * CONFIG.TILE_SIZE);
        ctx.lineTo(canvas.width, row * CONFIG.TILE_SIZE);
        ctx.stroke();
    }
    
    for (let col = 0; col <= CONFIG.GRID_COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * CONFIG.TILE_SIZE, 0);
        ctx.lineTo(col * CONFIG.TILE_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Draw fire spawn zone highlight (rightmost 2 columns)
    ctx.fillStyle = 'rgba(255, 107, 53, 0.15)';
    ctx.fillRect((CONFIG.GRID_COLS - 2) * CONFIG.TILE_SIZE, 0, CONFIG.TILE_SIZE * 2, canvas.height);
    
    // Draw defenses
    ctx.font = '35px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    gameState.defenses.forEach(defense => {
        const x = defense.col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = defense.row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        // FIRE BREAK: Draw dirt square background
        if (defense.defenseType === 'firebreak') {
            ctx.fillStyle = '#8b7355';
            ctx.fillRect(defense.col * CONFIG.TILE_SIZE, defense.row * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            
            // Add some texture to the dirt (random darker spots)
            ctx.fillStyle = '#6b5838';
            //for (let i = 0; i < 8; i++) {
            //    const spotX = defense.col * CONFIG.TILE_SIZE + Math.random() * CONFIG.TILE_SIZE;
            //    const spotY = defense.row * CONFIG.TILE_SIZE + Math.random() * CONFIG.TILE_SIZE;
            //    ctx.fillRect(spotX, spotY, 8, 8);
            //}
        }
        
        // Draw icon (show on-fire sprite if burning)
        const defenseInfo = DEFENSES[defense.defenseType];
        
        if (defense.onFire) {
            // Burning defense sprites
            if (defense.defenseType === 'hose') {
                drawSprite('hoseOnFire', defenseInfo.iconOnFire, x, y);
            } else if (defense.defenseType === 'sprinkler') {
                drawSprite('sprinklerOnFire', defenseInfo.iconOnFire, x, y);
            } else {
                drawSprite(defense.defenseType, defenseInfo.icon, x, y);
            }
        } else {
            // Normal defense sprites
            drawSprite(defense.defenseType, defenseInfo.icon, x, y);
        }
        
        // Draw health bar BELOW defense sprite (skip for fire breaks - they're indestructible)
        if (defense.defenseType !== 'firebreak') {
            const healthPercent = defense.health / DEFENSES[defense.defenseType].health;
            ctx.fillStyle = healthPercent > 0.5 ? '#28a745' : (healthPercent > 0.25 ? '#ffc107' : '#dc3545');
            ctx.fillRect(defense.col * CONFIG.TILE_SIZE + 5, defense.row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE - 10, (CONFIG.TILE_SIZE - 10) * healthPercent, 5);
        }
    });
    
    // Draw fires
    ctx.font = '35px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    gameState.fires.forEach(fire => {
        // Use pixel position for smooth movement
        const x = fire.x + CONFIG.TILE_SIZE / 2;
        const y = fire.y + CONFIG.TILE_SIZE / 2;
        
        // Draw fire sprite based on type FIRST
        const fireIcon = FIRE_TYPES[fire.fireType].icon;
        const spriteKey = fire.fireType === 'ember' ? 'fireEmber' : 'fireNormal';
        drawSprite(spriteKey, fireIcon, x, y);
        
        // Draw health bar ABOVE fire sprite
        const healthPercent = fire.health / fire.maxHealth;
        const barWidth = CONFIG.TILE_SIZE - 20;
        const barHeight = 6;
        const barX = fire.x + 10;
        const barY = fire.y + 8; // Position above the sprite
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = healthPercent > 0.5 ? '#ff6b35' : (healthPercent > 0.25 ? '#ffc107' : '#28a745');
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    });
    
    // Draw water shots
    ctx.strokeStyle = '#1971c2';
    ctx.lineWidth = 3;
    gameState.waterShots.forEach(shot => {
        const x = shot.position * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const y = shot.positionRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        
        // Different colors for hose vs sprinkler
        if (shot.type === 'sprinkler') {
            ctx.fillStyle = '#74c0fc';
        } else {
            ctx.fillStyle = '#4dabf7';
        }
        
        // Draw water droplet as circle
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
    
    // Draw selection highlight
    if (gameState.selectedDefense && gameState.mouseRow !== undefined && gameState.mouseCol !== undefined) {
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(gameState.mouseCol * CONFIG.TILE_SIZE, gameState.mouseRow * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
}

// ===========================
// CANVAS CLICK HANDLER
// ===========================

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const col = Math.floor(x / CONFIG.TILE_SIZE);
    const row = Math.floor(y / CONFIG.TILE_SIZE);
    
    if (gameState.selectedDefense) {
        placeDefense(row, col);
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameState.mouseCol = Math.floor(x / CONFIG.TILE_SIZE);
    gameState.mouseRow = Math.floor(y / CONFIG.TILE_SIZE);
});

// ===========================
// UI UPDATES
// ===========================

function updateMoneyDisplay() {
    document.getElementById('money-amount').textContent = gameState.money;
    
    // Update defense button states
    document.querySelectorAll('.defense-btn').forEach(btn => {
        const defenseType = btn.dataset.defense;
        if (defenseType) {
            btn.disabled = gameState.money < DEFENSES[defenseType].cost;
        }
    });
}

function updateWaveDisplay() {
    document.getElementById('wave-number').textContent = gameState.waveNumber;
    
    // Update danger overlay intensity based on wave number
    updateDangerOverlay();
}

function updateDangerOverlay() {
    const overlay = document.getElementById('danger-overlay');
    if (!overlay) return;
    
    // Calculate intensity: 0 at wave 1, increases with each wave
    // Caps at wave 15 for max intensity
    const intensity = Math.min(gameState.waveNumber - 1, 14) / 14; // 0 to 1
    
    // Apply opacity (0 to 1)
    overlay.style.opacity = intensity * 0.7; // Max 70% opacity
    
    // Update gradient colors to get more intense
    const red = Math.floor(200 + (intensity * 55)); // 200 to 255
    const innerAlpha = 0.1 + (intensity * 0.3); // 0.1 to 0.4
    const outerAlpha = 0.2 + (intensity * 0.5); // 0.2 to 0.7
    
    overlay.style.background = `radial-gradient(circle at center, 
        rgba(255, 0, 0, 0) 0%, 
        rgba(${red}, 50, 0, ${innerAlpha}) 50%, 
        rgba(${red - 50}, 0, 0, ${outerAlpha}) 100%)`;
    
    // Speed up pulsing as intensity increases
    const pulseDuration = 3 - (intensity * 1.5); // 3s to 1.5s
    overlay.style.animationDuration = `${pulseDuration}s`;
}

function updateEscapeStatus() {
    const statusElement = document.getElementById('escape-status');
    const leaveBtn = document.getElementById('leave-btn');
    
    if (gameState.escapeAvailable) {
        statusElement.innerHTML = '🚗 Escape: <span class="status-open">AVAILABLE</span>';
        leaveBtn.disabled = false;
    } else {
        statusElement.innerHTML = '🚗 Escape: <span class="status-blocked">BLOCKED</span>';
        leaveBtn.disabled = true;
    }
}

function updateIncomeStatus() {
    const statusElement = document.getElementById('income-status');
    
    if (gameState.incomeActive) {
        statusElement.innerHTML = '📈 Income: $<span id="income-rate">50</span>/sec';
        statusElement.classList.remove('stopped');
    } else {
        statusElement.innerHTML = '❌ Income: STOPPED';
        statusElement.classList.add('stopped');
    }
}

function updateHelicopterButton() {
    const helicopterBtn = document.getElementById('helicopter-btn');
    
    if (gameState.helicopterAvailable && !gameState.helicopterUsed) {
        helicopterBtn.disabled = false;
        helicopterBtn.textContent = '🚁 HELICOPTER WATER DROP (One Time Only!)';
    } else if (gameState.helicopterUsed) {
        helicopterBtn.disabled = true;
        helicopterBtn.textContent = '🚁 HELICOPTER USED';
    } else {
        helicopterBtn.disabled = true;
    }
}

function activateHelicopter() {
    if (!gameState.helicopterAvailable || gameState.helicopterUsed) {
        return;
    }
    
    gameState.helicopterUsed = true;
    updateHelicopterButton();
    
    // Visual feedback
    updateGameMessage('🚁 HELICOPTER INCOMING! Dousing all flames...');
    
    // DRAMATIC BLUE FLASH EFFECT
    const canvas = document.getElementById('game-canvas');
    canvas.style.filter = 'brightness(2) saturate(2) hue-rotate(180deg)';
    
    setTimeout(() => {
        canvas.style.filter = 'brightness(1.5) saturate(1.5) hue-rotate(180deg)';
    }, 100);
    
    setTimeout(() => {
        canvas.style.filter = 'brightness(2) saturate(2) hue-rotate(180deg)';
    }, 200);
    
    setTimeout(() => {
        canvas.style.filter = 'none';
    }, 500);
    
    // CREATE FALLING WATER DROPLETS
    createWaterDropletEffect();
    
    // Clear ALL fires from the screen
    const fireCount = gameState.fires.length;
    gameState.fires.forEach(fire => {
        // Clear from grid
        if (gameState.grid[fire.row] && gameState.grid[fire.row][fire.col] === fire) {
            gameState.grid[fire.row][fire.col] = null;
        }
    });
    
    // Empty the fires array
    gameState.fires = [];
    
    // RE-ENABLE ESCAPE! Player gets a chance to leave!
    gameState.escapeAvailable = true;
    updateEscapeStatus();
    
    console.log(`🚁 Helicopter water drop! Extinguished ${fireCount} fires!`);
    console.log('✅ Escape re-enabled! Player can leave now!');
    
    // Give hope message
    setTimeout(() => {
        updateGameMessage('All flames extinguished! Quick - LEAVE NOW while you can!');
    }, 2000);
    
    // After 5 seconds, warning
    setTimeout(() => {
        updateGameMessage('⚠️ Fire continues to spawn. This was your last chance!');
    }, 6000);
}

// Create dramatic water droplet visual effect
function createWaterDropletEffect() {
    const canvas = document.getElementById('game-canvas');
    const container = canvas.parentElement;
    
    // Create 50 water droplets
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const droplet = document.createElement('div');
            droplet.className = 'water-droplet-effect';
            droplet.textContent = '💧';
            droplet.style.left = Math.random() * 100 + '%';
            droplet.style.animationDelay = Math.random() * 0.5 + 's';
            droplet.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
            container.appendChild(droplet);
            
            // Remove after animation
            setTimeout(() => {
                droplet.remove();
            }, 3000);
        }, i * 30); // Stagger the droplets
    }
}

function updateGameMessage(message) {
    document.getElementById('game-message').textContent = message;
}

// ===========================
// GAME ENDING
// ===========================

function leaveEarly() {
    gameState.gameActive = false;
    clearAllTimers();
    
    // Animate car leaving
    const carSprite = document.getElementById('car-sprite');
    carSprite.classList.add('leaving');
    
    setTimeout(() => {
        endGame('left-early');
    }, 2000);
}

function endGame(outcome) {
    gameState.gameActive = false;
    gameState.gameOver = true;
    clearAllTimers();
    
    console.log('Game ending:', outcome);
    
    if (outcome === 'house-destroyed') {
        // Show cutscene for dice roll
        showScreen('cutscene');
    } else if (outcome === 'left-early') {
        showResults({
            survived: true,
            houseSaved: false,
            diceRoll: null,
            leftEarly: true
        });
    }
}

// ===========================
// CUTSCENE (DICE ROLL)
// ===========================

document.getElementById('roll-survival-btn').addEventListener('click', () => {
    const btn = document.getElementById('roll-survival-btn');
    btn.disabled = true;
    
    const dice = document.getElementById('cutscene-dice');
    dice.classList.add('rolling');
    
    // Animate dice roll
    let rollCount = 0;
    const rollInterval = setInterval(() => {
        dice.textContent = Math.floor(Math.random() * 6) + 1;
        rollCount++;
        
        if (rollCount >= 15) {
            clearInterval(rollInterval);
            dice.classList.remove('rolling');
            
            // Final roll
            const finalRoll = Math.floor(Math.random() * 6) + 1;
            dice.textContent = finalRoll;
            
            // Show result
            document.getElementById('dice-value').textContent = finalRoll;
            document.getElementById('dice-result').classList.remove('hidden');
            document.getElementById('see-results-btn').classList.remove('hidden');
            
            // Store roll for results
            gameState.survivalRoll = finalRoll;
        }
    }, 100);
});

document.getElementById('see-results-btn').addEventListener('click', () => {
    const survived = gameState.survivalRoll >= 4;
    showResults({
        survived: survived,
        houseSaved: false,
        diceRoll: gameState.survivalRoll,
        leftEarly: false
    });
});

// ===========================
// RESULTS SCREEN
// ===========================

function showResults(outcome) {
    let resultTitle = 'Game Over';
    let resultIcon = '💀';
    let resultMessage = '';
    let resultDescription = '';
    let lessonText = '';
    
    // Calculate property damage
    const propertyDamage = outcome.houseSaved ? 50000 : 500000; // Huge loss if house destroyed
    const netTotal = gameState.money - propertyDamage;
    
    if (outcome.leftEarly) {
        resultTitle = 'You Survived! ✅';
        resultIcon = '🚗';
        resultMessage = 'You evacuated safely';
        resultDescription = 'By leaving early, you guaranteed your survival. Your house and property were lost to the fire, but you are alive and unharmed.';
        lessonText = 'In real bushfires, leaving early is ALWAYS the safest option. "Leave and Live" is the core message from fire services. Property can be replaced, but lives cannot. You made the right choice.';
    } else if (outcome.survived) {
        resultTitle = 'Miraculous Survival 🏆';
        resultIcon = '😰';
        resultMessage = `You rolled a ${outcome.diceRoll} - You survived!`;
        resultDescription = 'Against incredible odds, you survived inside your house as the fire raged around you. However, your property suffered massive damage. This outcome is extremely rare in reality.';
        lessonText = 'While you survived in this game, attempting to shelter inside during a bushfire is a deadly gamble. Over 70% of bushfire deaths occur when people try to defend their homes or wait too long to leave. This is not recommended under any circumstances.';
    } else {
        resultTitle = 'Tragic Loss 💀';
        resultIcon = '💀';
        resultMessage = `You rolled a ${outcome.diceRoll} - You did not survive`;
        resultDescription = 'The fire overwhelmed you. You were unable to escape and perished inside your home. This is the harsh reality of staying too long.';
        lessonText = 'This outcome reflects reality: bushfires are unpredictable and deadly. Hundreds of Australians have lost their lives trying to defend their homes. Emergency services consistently say: leave early, or you may not survive. Your life is worth more than any property.';
    }
    
    // Update results screen
    document.getElementById('result-title').textContent = resultTitle;
    document.getElementById('result-icon').textContent = resultIcon;
    document.getElementById('result-message').textContent = resultMessage;
    document.getElementById('result-description').textContent = resultDescription;
    document.getElementById('lesson-text').textContent = lessonText;
    
    // Financial report
    document.getElementById('money-earned').textContent = gameState.moneyEarned;
    document.getElementById('money-spent').textContent = gameState.moneySpent;
    document.getElementById('property-damage').textContent = propertyDamage.toLocaleString();
    
    const netElement = document.getElementById('net-total');
    netElement.textContent = (netTotal >= 0 ? '+' : '') + '$' + netTotal.toLocaleString();
    netElement.className = netTotal >= 0 ? 'money-positive' : 'money-negative';
    
    showScreen('results');
}

// ===========================
// EVENT LISTENERS
// ===========================

document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('play');
    initGame();
});

document.querySelectorAll('.defense-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const defenseType = btn.dataset.defense;
        if (defenseType) {
            selectDefense(defenseType);
        }
    });
});

document.getElementById('clear-selection').addEventListener('click', () => {
    clearDefenseSelection();
});

document.getElementById('helicopter-btn').addEventListener('click', () => {
    if (confirm('🚁 Use helicopter water drop? This is your last resort! (One time only)')) {
        activateHelicopter();
    }
});

document.getElementById('leave-btn').addEventListener('click', () => {
    if (!gameState.escapeAvailable) {
        alert('🚫 Escape blocked! Fire is blocking the driveway!');
        return;
    }
    if (confirm('Are you sure you want to leave? This will end the game.')) {
        leaveEarly();
    }
});

document.getElementById('restart-btn').addEventListener('click', () => {
    showScreen('play');
    initGame();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    showScreen('menu');
});

// ===========================
// INITIALIZE ON LOAD
// ===========================

window.addEventListener('load', () => {
    showScreen('menu');
    console.log('Bushfire Balance loaded');
});
