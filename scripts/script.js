// =========================
// CANVAS SETUP
// =========================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =========================
// STATE
// =========================

let isGame = false;

const toggleBtn = document.getElementById("themeToggle");

// =========================
// TOGGLE MODE
// =========================

toggleBtn.addEventListener("click", () => {

    isGame = !isGame;

    document.body.classList.toggle("game", isGame);

    if (isGame) {
        buildWorldFromHTML();
    }

    toggleBtn.textContent = isGame
        ? "📄 Normal Mode"
        : "🎮 Game Mode";
});

// =========================
// INPUT
// =========================

const keys = {};

document.addEventListener("keydown", (e) => {

    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "e") {
        const link = getNearbyLink();
        if (link) window.location.href = link.href;
    }

    if ((e.key === "w" || e.key === "arrowup") && isGrounded()) {
        player.vy = jumpPower;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// =========================
// PLAYER
// =========================

const player = {
    x: 100,
    y: 100,
    w: 20,
    h: 20,
    vx: 0,
    vy: 0
};

const gravity = 0.7;
const speed = 4;
const jumpPower = -13;

// =========================
// CAMERA
// =========================

const camera = { x: 0, y: 0 };

// =========================
// WORLD BOUNDS
// =========================

const worldBounds = {
    minX: 0,
    maxX: 5000,
    minY: 0,
    maxY: 3000
};

// =========================
// LOOP
// =========================

let lastTime = 0;
let acc = 0;
const FIXED = 1000 / 60;

function loop(time) {

    if (!lastTime) lastTime = time;

    const delta = time - lastTime;
    lastTime = time;

    acc += delta;

    while (acc >= FIXED) {
        if (isGame) physicsUpdate();
        acc -= FIXED;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// =========================
// PHYSICS
// =========================

function physicsUpdate() {

    player.vx = 0;

    if (keys["a"] || keys["arrowleft"]) player.vx = -speed;
    if (keys["d"] || keys["arrowright"]) player.vx = speed;

    player.vy += gravity;

    player.x += player.vx;
    player.y += player.vy;

    const objects = GameData.objects;

    for (let o of objects) {

        if (o.type !== "link") {

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
    }

    // bounds
    if (player.x < worldBounds.minX) player.x = worldBounds.minX;
    if (player.x > worldBounds.maxX) player.x = worldBounds.maxX;

    if (player.y > worldBounds.maxY) {
        player.x = 200;
        player.y = 100;
        player.vx = 0;
        player.vy = 0;
    }

    // camera follow
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
}

// =========================
// RENDER
// =========================

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGame) return;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // FIX TEXT VISIBILITY (BELANGRIJK)
    ctx.font = "16px monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#fff";

    const objects = GameData.objects;

    // GRID
    ctx.strokeStyle = "rgba(0,245,255,0.08)";

    for (let x = -3000; x < 3000; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, -3000);
        ctx.lineTo(x, 3000);
        ctx.stroke();
    }

    for (let y = -3000; y < 3000; y += 40) {
        ctx.beginPath();
        ctx.moveTo(-3000, y);
        ctx.lineTo(3000, y);
        ctx.stroke();
    }

    // OBJECTS
    for (let o of objects) {

        if (o.type === "link") {
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.strokeStyle = "#00f5ff";
            ctx.strokeRect(o.x, o.y, o.w, o.h);

            ctx.fillStyle = "#fff";
            ctx.fillText(o.text, o.x + 10, o.y + 15);
        }

        if (o.type === "section") {
            ctx.fillStyle = "#111827";
            ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.fillStyle = "#ffcc00";
            ctx.fillText(o.text, o.x + 10, o.y + 15);
        }

        if (o.type === "text") {
            ctx.fillStyle = "#d1d5db";
            ctx.fillText(o.text, o.x, o.y);
        }

        if (o.type === "title") {
            ctx.fillStyle = "#00f5ff";
            ctx.fillText(o.text, o.x, o.y);
        }
    }

    // PLAYER
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();
}

// =========================
// LINK DETECTION
// =========================

function getNearbyLink() {

    const range = 40;

    return GameData.links.find(l =>
        player.x < l.x + l.w + range &&
        player.x + player.w > l.x - range &&
        player.y < l.y + l.h &&
        player.y + player.h > l.y
    );
}

// =========================
// GROUND CHECK
// =========================

function isGrounded() {

    return GameData.objects.some(o =>
        o.type !== "link" &&
        player.y + player.h >= o.y &&
        player.y + player.h <= o.y + 10 &&
        player.x + player.w > o.x &&
        player.x < o.x + o.w
    );
}