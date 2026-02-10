const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const gameLog = document.getElementById('game-log');
const statusText = document.getElementById('status-text');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const COLORS = {
    snakeHead: '#000080', // Win Navy
    snakeBody: '#008080', // Win Teal
    food: '#ff0000',
    background: '#000000'
};

let snake = [{ x: 10, y: 10 }];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let nextDx = 0;
let nextDy = 0;
let score = 0;
let highScore = localStorage.getItem('snake-high-score') || 0;
let gameRunning = false;
let gameLoop;
let speed = 200;

highScoreElement.textContent = highScore.toString().padStart(3, '0');

function log(message) {
    const pre = gameLog.querySelector('pre');
    const lines = pre.innerHTML.split('\n');
    lines.push(`&gt; ${message}`);
    if (lines.length > 5) lines.shift();
    pre.innerHTML = lines.join('\n');
}

function initGame() {
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    nextDx = 1;
    nextDy = 0;
    score = 0;
    scoreElement.textContent = '000';
    statusText.textContent = 'Running';
    createFood();
}

function createFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        createFood();
    }
}

function draw() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#111111';
    for (let i = 0; i < canvas.width; i += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snakeBody;

        ctx.shadowBlur = index === 0 ? 15 : 10;
        ctx.shadowColor = index === 0 ? COLORS.snakeHead : COLORS.snakeBody;

        ctx.fillRect(segment.x * GRID_SIZE + 1, segment.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);

        ctx.shadowBlur = 0;
    });

    ctx.fillStyle = COLORS.food;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.food;
    ctx.fillRect(food.x * GRID_SIZE + 2, food.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    ctx.shadowBlur = 0;
}

function move() {
    dx = nextDx;
    dy = nextDy;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        return gameOver('CRITICAL_ERR: COLLISION_WALL');
    }

    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return gameOver('CRITICAL_ERR: SELF_DESTRUCT');
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score.toString().padStart(3, '0');
        log(`EATEN: PIXEL_DATA [SCORE: ${score}]`);
        createFood();
        if (speed > 50) speed -= 2;
        clearInterval(gameLoop);
        gameLoop = setInterval(run, speed);
    } else {
        snake.pop();
    }
}

function gameOver(reason) {
    gameRunning = false;
    clearInterval(gameLoop);
    log(reason);
    log('SYSTEM HALT.');
    statusText.textContent = 'Game Over';
    startBtn.textContent = 'RESTART';

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snake-high-score', highScore);
        highScoreElement.textContent = highScore.toString().padStart(3, '0');
        log('NEW HIGH_SCORE ESTABLISHED');
    }
}

function run() {
    if (!gameRunning) return;
    move();
    draw();
}

function handleInput(e) {
    if (!gameRunning) return;

    switch (e.key) {
        case 'ArrowUp':
            if (dy !== 1) { nextDx = 0; nextDy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { nextDx = 0; nextDy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { nextDx = -1; nextDy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { nextDx = 1; nextDy = 0; }
            break;
    }
}

startBtn.addEventListener('click', () => {
    if (gameRunning) return;

    gameRunning = true;
    startBtn.textContent = 'RUNNING...';
    log('BOOTING ENGINE...');
    initGame();
    gameLoop = setInterval(run, speed);
});

window.addEventListener('keydown', handleInput);

draw();

