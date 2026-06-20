const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* =========================
   TOGGLE MODE
========================= */

const toggleBtn = document.getElementById("themeToggle");

let isGame = false;

toggleBtn.addEventListener("click", () => {
    isGame = !isGame;

    document.body.classList.toggle("game", isGame);

    toggleBtn.textContent = isGame
        ? "📄 Normal Mode"
        : "🎮 Game Mode";
});

/* =========================
   INPUT
========================= */

const keys = {};

document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    if ((e.key === "w" || e.key === "ArrowUp") && isGrounded()) {
        player.vy = jumpPower;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

/* =========================
   PLAYER
========================= */

const player = {
    x: 100,
    y: 200,
    w: 20,
    h: 20,
    vx: 0,
    vy: 0
};

const gravity = 0.7;
const speed = 4;
const jumpPower = -13;

/* =========================
   CAMERA
========================= */

const camera = {
    x: 0,
    y: 0
};

/* =========================
   WORLD
========================= */

let objects = [];

function initWorld() {
    objects = [
        { x: -500, y: 500, w: 3000, h: 60 }, // ground
        { x: 200, y: 400, w: 200, h: 20 },
        { x: 500, y: 320, w: 200, h: 20 },
        { x: 800, y: 260, w: 200, h: 20 },
        { x: 1100, y: 200, w: 200, h: 20 }
    ];
}

initWorld();

/* =========================
   FIXED TIMESTEP LOOP
========================= */

let lastTime = 0;
let accumulator = 0;
const FIXED_STEP = 1000 / 60;

function loop(time) {
    if (!lastTime) lastTime = time;

    let delta = time - lastTime;
    lastTime = time;

    accumulator += delta;

    while (accumulator >= FIXED_STEP) {
        if (isGame) physicsUpdate();
        accumulator -= FIXED_STEP;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

/* =========================
   PHYSICS
========================= */

function physicsUpdate() {

    player.vx = 0;

    if (keys["a"] || keys["arrowleft"]) player.vx = -speed;
    if (keys["d"] || keys["arrowright"]) player.vx = speed;

    player.vy += gravity;

    player.x += player.vx;
    player.y += player.vy;

    // collision
    for (let o of objects) {
        if (
            player.x < o.x + o.w &&
            player.x + player.w > o.x &&
            player.y < o.y + o.h &&
            player.y + player.h > o.y
        ) {
            if (player.vy > 0) {
                player.y = o.y - player.h;
                player.vy = 0;
            }
        }
    }

    // camera follow
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
}

/* =========================
   RENDER
========================= */

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGame) return;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // background grid
    ctx.strokeStyle = "rgba(0,245,255,0.08)";

    for (let x = -2000; x < 2000; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, -1000);
        ctx.lineTo(x, 1000);
        ctx.stroke();
    }

    for (let y = -1000; y < 1000; y += 40) {
        ctx.beginPath();
        ctx.moveTo(-2000, y);
        ctx.lineTo(2000, y);
        ctx.stroke();
    }

    // platforms
    for (let o of objects) {
        ctx.fillStyle = "rgba(0,245,255,0.2)";
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.strokeStyle = "#00f5ff";
        ctx.strokeRect(o.x, o.y, o.w, o.h);
    }

    // player
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();
}

/* =========================
   GROUND CHECK
========================= */

function isGrounded() {
    for (let o of objects) {
        if (
            player.y + player.h >= o.y &&
            player.y + player.h <= o.y + 10 &&
            player.x + player.w > o.x &&
            player.x < o.x + o.w
        ) {
            return true;
        }
    }
    return false;
}