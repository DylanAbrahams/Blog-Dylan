// =========================
// CANVAS SETUP
// =========================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// =========================
// STATE
// =========================

const toggleBtn = document.getElementById("themeToggle");
let isGame = JSON.parse(localStorage.getItem("isGame")) || false;

// =========================
// WORLD DATA
// =========================

let GameData = {
    objects: [],
    links: []
};

let worldBounds = {
    minX: 0,
    maxX: 3000,
    minY: -1000,
    maxY: 3000
};

// =========================
// PLAYER
// =========================

const player = {
    x: Number(localStorage.getItem("playerX")) || 100,
    y: Number(localStorage.getItem("playerY")) || 100,
    w: 20,
    h: 20,
    vx: 0,
    vy: 0
};

// =========================
// SETTINGS
// =========================

const gravity = 0.7;
const speed = 4;
const jumpPower = -13;

// =========================
// CAMERA
// =========================

const camera = { x: 0, y: 0 };

// =========================
// INPUT
// =========================

const keys = {};

document.addEventListener("keydown", (e) => {

    keys[e.key.toLowerCase()] = true;

    if ((e.key === "w" || e.key === "ArrowUp") && isGrounded()) {
        player.vy = jumpPower;
    }

    if (e.key.toLowerCase() === "e") {
        const link = getNearbyLink();
        if (link) window.location.href = link.href;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// =========================
// TOGGLE GAME
// =========================

toggleBtn.addEventListener("click", () => {

    isGame = !isGame;
    localStorage.setItem("isGame", JSON.stringify(isGame));

    document.body.classList.toggle("game", isGame);

    toggleBtn.textContent = isGame ? "📄 Normal Mode" : "🎮 Game Mode";

    if (isGame) {
        buildWorldFromHTML();

        const start = GameData.objects.find(o => o.type === "solid" && !o.isBorder);

        if (start) {
            player.x = start.x + 100;
            player.y = start.y - 80;
        }
    }
});

// =========================
// LOAD
// =========================

window.addEventListener("load", () => {
    if (isGame) {
        document.body.classList.add("game");
        buildWorldFromHTML();
    }
});

// =========================
// WORLD GENERATOR (UNCHANGED)
// =========================

window.buildWorldFromHTML = function () {

    const main = document.querySelector("main");
    const sections = Array.from(main.querySelectorAll("h2"));

    const objects = [];
    const links = [];

    const zoneW = 1200;
    const zoneH = 800;

    sections.forEach((section, i) => {

        const zoneX = (i % 2) * zoneW + 600;
        const zoneY = Math.floor(i / 2) * zoneH + 500;

        const floorY = zoneY + 200;
        const midY = zoneY + 40;
        const topY = zoneY - 120;

        objects.push({ type: "solid", x: zoneX - 350, y: floorY, w: 700, h: 40 });
        objects.push({ type: "solid", x: zoneX - 250, y: midY, w: 500, h: 30 });
        objects.push({ type: "solid", x: zoneX - 300, y: topY, w: 600, h: 30 });

        objects.push({
            type: "title",
            x: zoneX - 200,
            y: topY - 40,
            text: section.textContent
        });

        const list = section.nextElementSibling;

        if (list && list.tagName === "UL") {

            const items = Array.from(list.querySelectorAll("a"));

            const layers = [floorY - 60, midY - 60, topY - 60];

            layers.forEach((layerY, layerIndex) => {

                const layerItems = items.filter((_, i) => i % layers.length === layerIndex);

                const spacing = 180;
                const totalWidth = (layerItems.length - 1) * spacing;
                const startX = zoneX - totalWidth / 2;

                layerItems.forEach((a, i) => {

                    const x = startX + i * spacing;

                    objects.push({
                        type: "link",
                        x,
                        y: layerY,
                        w: 140,
                        h: 40,
                        text: a.textContent,
                        href: a.href
                    });

                    links.push({ x, y: layerY, w: 140, h: 40, href: a.href });
                });
            });
        }
    });

    // =========================
    // BORDER CALC
    // =========================

    const padding = 300;
    const borderThickness = 80;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let o of objects) {
        if (o.type === "solid" || o.type === "link") {
            minX = Math.min(minX, o.x);
            maxX = Math.max(maxX, o.x + o.w);
            minY = Math.min(minY, o.y);
            maxY = Math.max(maxY, o.y + o.h);
        }
    }

    worldBounds = {
        minX: minX - padding,
        maxX: maxX + padding,
        minY: minY - padding,
        maxY: maxY + padding
    };

    // FIXED BORDERS (IMPORTANT)
    const W = worldBounds.maxX - worldBounds.minX;
    const H = worldBounds.maxY - worldBounds.minY;

    objects.push({
        type: "solid",
        x: worldBounds.minX,
        y: worldBounds.minY,
        w: W,
        h: borderThickness,
        isBorder: true
    });

    objects.push({
        type: "solid",
        x: worldBounds.minX,
        y: worldBounds.maxY - borderThickness,
        w: W,
        h: borderThickness,
        isBorder: true
    });

    objects.push({
        type: "solid",
        x: worldBounds.minX,
        y: worldBounds.minY,
        w: borderThickness,
        h: H,
        isBorder: true
    });

    objects.push({
        type: "solid",
        x: worldBounds.maxX - borderThickness,
        y: worldBounds.minY,
        w: borderThickness,
        h: H,
        isBorder: true
    });

    GameData.objects = objects;
    GameData.links = links;
};

// =========================
// LOOP
// =========================

let lastTime = 0;
let acc = 0;
const FIXED = 1000 / 60;

function loop(t) {

    if (!lastTime) lastTime = t;

    const delta = t - lastTime;
    lastTime = t;

    acc += delta;

    while (acc >= FIXED) {
        if (isGame) update();
        acc -= FIXED;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// =========================
// FIXED PHYSICS (NO TELEPORT BUG)
// =========================

function update() {

    player.vx = 0;

    if (keys["a"] || keys["arrowleft"]) player.vx = -speed;
    if (keys["d"] || keys["arrowright"]) player.vx = speed;

    player.vy += gravity;

    // --- X movement + collision ---
    player.x += player.vx;
    resolveCollisions("x");

    // --- Y movement + collision ---
    player.y += player.vy;
    resolveCollisions("y");

    // clamp only soft bounds (NO TELEPORT BUG)
    player.x = Math.max(worldBounds.minX, Math.min(worldBounds.maxX, player.x));

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    localStorage.setItem("playerX", player.x);
    localStorage.setItem("playerY", player.y);
}

// =========================
// SEPARATE COLLISION RESOLUTION
// =========================

function resolveCollisions(axis) {

    for (let o of GameData.objects) {

        if (o.type !== "solid") continue;

        if (
            player.x < o.x + o.w &&
            player.x + player.w > o.x &&
            player.y < o.y + o.h &&
            player.y + player.h > o.y
        ) {

            if (axis === "y") {

                if (player.vy > 0) {
                    player.y = o.y - player.h;
                    player.vy = 0;
                }

                if (player.vy < 0) {
                    player.y = o.y + o.h;
                    player.vy = 0;
                }
            }

            if (axis === "x") {

                if (player.vx > 0) {
                    player.x = o.x - player.w;
                }

                if (player.vx < 0) {
                    player.x = o.x + o.w;
                }
            }
        }
    }
}

// =========================
// RENDER (UNCHANGED)
// =========================

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isGame) return;

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    for (let o of GameData.objects) {

        if (o.type === "solid") {

            if (o.isBorder) {
                ctx.fillStyle = "rgba(255, 204, 0, 0.25)";
                ctx.strokeStyle = "#ffcc00";
                ctx.fillRect(o.x, o.y, o.w, o.h);
                ctx.strokeRect(o.x, o.y, o.w, o.h);
            } else {
                ctx.fillStyle = "#1f2937";
                ctx.fillRect(o.x, o.y, o.w, o.h);
            }
        }

        if (o.type === "link") {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.strokeStyle = "#00f5ff";
            ctx.strokeRect(o.x, o.y, o.w, o.h);

            ctx.fillStyle = "#fff";
            ctx.font = "12px sans-serif";
            ctx.fillText(o.text, o.x + 10, o.y + 25);
        }

        if (o.type === "title") {
            ctx.fillStyle = "#00f5ff";
            ctx.font = "18px sans-serif";
            ctx.fillText(o.text, o.x, o.y);
        }
    }

    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();
}

// =========================
// HELPERS
// =========================

function getNearbyLink() {
    return GameData.objects.find(o =>
        o.type === "link" &&
        player.x < o.x + o.w &&
        player.x + player.w > o.x &&
        player.y < o.y + o.h &&
        player.y + player.h > o.y
    );
}

function isGrounded() {
    return GameData.objects.some(o =>
        o.type === "solid" &&
        player.y + player.h >= o.y &&
        player.y + player.h <= o.y + 10 &&
        player.x + player.w > o.x &&
        player.x < o.x + o.w
    );
}