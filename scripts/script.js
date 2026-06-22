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

let gpJumpPressed = false;
let gpAInteractPressed = false;
let gpYPressed = false;

let scrollSpeed = 0;
const maxScrollSpeed = 6;
const scrollAcceleration = 0.15;
const scrollFriction = 0.85;

const fadeOverlay = document.getElementById("fadeOverlay");
let isFading = false;

// =========================
// WORLD DATA
// =========================

let GameData = {
    objects: [],
    links: []
};

let voidHeight = 1000;

// =========================
// PLAYER
// =========================

const player = {
    x: Number(localStorage.getItem("playerX")) || 750,
    y: Number(localStorage.getItem("playerY")) || 510,
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
const jumpPower = -15;

// =========================
// CAMERA
// =========================

const camera = { x: 0, y: 0 };

// =========================
// INPUT
// =========================

const keys = {};

const touchControls = {
    left: false,
    right: false,
    up: false,
    down: false
};

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

function getGamepad() {
    return navigator.getGamepads ? navigator.getGamepads()[0] : null;
}

function updateGamepad() {
    const gp = getGamepad();
    if (!gp) return;

    // LEFT STICK (lopen)
    const x = gp.axes[0];

    if (Math.abs(x) > 0.15) {
        player.vx = x * speed;
    }

    // -------------------------
    // BUTTONS
    // -------------------------

    const a = gp.buttons[1]?.pressed; // ENTER / interact
    const b = gp.buttons[0]?.pressed; // JUMP

    // JUMP (B)
    if (b && !gpJumpPressed && isGrounded()) {
        player.vy = jumpPower;
    }

    // ENTER / INTERACT (A)
    if (a && !gpAInteractPressed) {
        const link = getNearbyLink();
        if (link) window.location.href = link.href;
    }

    // track states (edge detection)
    gpJumpPressed = b;
    gpAInteractPressed = a;


    const y = gp.buttons[3]?.pressed; // Y button (Switch Pro / Xbox mapping)

    // TOGGLE GAME MODE (Y)
    if (y && !gpYPressed) {
        isGame = !isGame;
        localStorage.setItem("isGame", JSON.stringify(isGame));

        document.body.classList.toggle("game", isGame);

        toggleBtn.textContent = isGame ? "📄 Normal Mode" : "🎮 Game Mode";

        if (isGame) {
            buildWorldFromHTML();

            const start = GameData.objects.find(o => o.type === "solid" && !o.isBorder);

            if (start) {
                player.x = 750;
                player.y = 510;
            }
        }
    }

    // edge detection opslaan
    gpYPressed = y;

    
}

function mobileJump() {
    if (isGrounded()) {
        player.vy = jumpPower;
    }
}

function mobileInteract() {
    const link = getNearbyLink();

    if (link) {
        window.location.href = link.href;
    }
}


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
            player.x = 750;
            player.y = 510;
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
// WORLD GENERATOR
// =========================

window.buildWorldFromHTML = function () {

    const main = document.querySelector("main");
    const sections = Array.from(main.querySelectorAll("h2"));

    const objects = [];
    const zonePositions = [];

    // =========================
    // CONFIG
    // =========================

    const layout = [3, 2];

    const zoneWidthTop = 780;
    const zoneWidthBottom = 1080;

    const centerX = canvas.width / 2;

    let index = 0;

    // =========================
    // ZONES
    // =========================

    for (let r = 0; r < layout.length; r++) {

        const isBottom = r === 1;
        const count = layout[r];

        const rowItems = sections.slice(index, index + count);

        const zoneY = isBottom ? 550 : 360;
        const zoneWidth = isBottom ? zoneWidthBottom : zoneWidthTop;

        const rowWidth = (count - 1) * zoneWidth;
        const startX = centerX - rowWidth / 2;

        rowItems.forEach((section, i) => {

            const zoneX = startX + i * zoneWidth;

            zonePositions.push({
                section,
                zoneX,
                zoneY,
                isBottom,
                zoneWidth
            });
        });

        index += count;
    }

    // =========================
    // BUILD ZONES
    // =========================

    zonePositions.forEach(({ section, zoneX, zoneY, isBottom, zoneWidth }) => {

        const list = section.nextElementSibling;
        const items = list ? Array.from(list.querySelectorAll("li")) : [];

        const count = items.length;

        let layerCount = 1;
        if (count > 3) layerCount = 2;
        if (count > 6) layerCount = 3;

        const PLATFORM_STEP = 120;

        const PLATFORM_BASE_TOP = 260;
        const PLATFORM_BASE_BOTTOM = 360;

        const basePlatformY = isBottom
            ? PLATFORM_BASE_BOTTOM
            : PLATFORM_BASE_TOP;

        const baseY = [
            zoneY + basePlatformY,
            zoneY + basePlatformY - PLATFORM_STEP,
            zoneY + basePlatformY - PLATFORM_STEP * 2
        ].slice(0, layerCount);

        // =========================
        // PLATFORMS (onder breder + lager)
        // =========================

        baseY.forEach(y => {

            const scale = isBottom ? 1.4 : 1;

            objects.push({
                type: "solid",
                x: zoneX - 350 * scale,
                y: y + (isBottom ? 60 : 30),
                w: 700 * scale,
                h: 40
            });
        });

        // =========================
        // TITLE (BELANGRIJK)
        // =========================

        const topY = baseY[baseY.length - 1];

        objects.push({
            type: "title",
            x: zoneX,
            zoneLeft: zoneX - (zoneWidth / 2),
            y: topY - 120,
            text: section.textContent
        });

        // =========================
        // LINKS / TEKST
        // =========================

        const SIZE = isBottom ? 85 : 70;
        const spacing = isBottom ? 160 : 120;

        let textOffsetY = 0;

        items.forEach((li, i) => {

            const a = li.querySelector("a");

            if (a) {

                const layerIndex = i % baseY.length;

                const layerItems = items.filter((_, idx) =>
                    items[idx].querySelector("a") &&
                    idx % baseY.length === layerIndex
                );

                const totalWidth = (layerItems.length - 1) * spacing;
                const startX = zoneX - totalWidth / 2;

                const posInLayer = layerItems.indexOf(li);

                const x = startX - 30 + posInLayer * spacing;
                const y = baseY[baseY.length - 1 - layerIndex] - (isBottom ? 60 : 45);

                objects.push({
                    type: "link",
                    x,
                    y,
                    w: SIZE,
                    h: SIZE,
                    text: li.textContent.trim(),
                    href: a.href
                });

            } else {

                objects.push({
                    type: "text",
                    x: zoneX - 350,
                    y: baseY[baseY.length - 1] - 40 + textOffsetY,
                    text: li.textContent.trim()
                });

                textOffsetY += 22;
            }
        });
    });

    // =========================
    // STAIRS
    // =========================

    const bottomZones = zonePositions.filter(z => z.isBottom);
    const centerZone = bottomZones[Math.floor(bottomZones.length / 2)];

    if (centerZone) {

        const stairX = centerZone.zoneX + 500;

        const steps = 4;
        const stepWidth = 150;
        const rise = 100;

        const startY = centerZone.zoneY + 430;

        for (let s = 1; s < steps; s++) {
            objects.push({
                type: "solid",
                x: stairX + s * 70,
                y: startY - s * rise,
                w: stepWidth,
                h: 40,
                isBridge: true
            });
        }
    }

    GameData.objects = objects;
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
        updateGamepad(); // <-- altijd input lezen

        if (isGame) update(); // <-- alleen physics

        acc -= FIXED;
    }

    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// =========================
// PHYSICS
// =========================

function update() {
    player.prevX = player.x;
    player.prevY = player.y;
    player.vx = 0;

    updateGamepad();

    if (
        keys["a"] ||
        keys["arrowleft"] ||
        touchControls.left
    ) {
        player.vx = -speed;
    }

    if (
        keys["d"] ||
        keys["arrowright"] ||
        touchControls.right
    ) {
        player.vx = speed;
    }

    player.vy += gravity;

    player.x += player.vx;
    resolveCollisions("x");

    player.y += player.vy;
    resolveCollisions("y");

    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    localStorage.setItem("playerX", player.x);
    localStorage.setItem("playerY", player.y);

    if (player.y > voidHeight && !isFading) {
        triggerFadeReset();
    }
}

// =========================
// COLLISION
// =========================

function resolveCollisions(axis) {

    for (let o of GameData.objects) {

        if (o.type !== "solid") continue;

        const overlapX =
            player.x < o.x + o.w &&
            player.x + player.w > o.x;

        const overlapY =
            player.y < o.y + o.h &&
            player.y + player.h > o.y;

        if (!overlapX || !overlapY) continue;

        if (axis === "y") {

            const wasAbove = player.prevY + player.h <= o.y;
            const wasBelow = player.prevY >= o.y + o.h;

            if (player.vy > 0 && wasAbove) {
                player.y = o.y - player.h;
                player.vy = 0;
            }

            // geen upward snapping meer
        }

        if (axis === "x") {

            const wasLeft = player.prevX + player.w <= o.x;
            const wasRight = player.prevX >= o.x + o.w;

            if (player.vx > 0 && wasLeft) {
                player.x = o.x - player.w;
            }

            if (player.vx < 0 && wasRight) {
                player.x = o.x + o.w;
            }
        }
    }
}

// =========================
// RENDER
// =========================

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGame) return;

    // =========================
    // PARALLAX BACKGROUND
    // =========================
    ctx.save();

    const parallax = 0.3;

    const bgX = -camera.x * parallax;
    const bgY = -camera.y * parallax;

    // base background
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    const gridSize = 32;
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;

    const startX = bgX % gridSize;
    const startY = bgY % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.restore();

    // =========================
    // WORLD
    // =========================
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    for (let o of GameData.objects) {

        // =========================
        // SOLID (platforms)
        // =========================
        if (o.type === "solid") {

            ctx.fillStyle = o.isBorder
                ? "rgba(255, 204, 0, 0.12)"
                : "#1f2937";

            ctx.fillRect(o.x, o.y, o.w, o.h);

            // depth shadow
            ctx.strokeStyle = "#4b5563";
            ctx.lineWidth = 3;
            ctx.strokeRect(o.x, o.y, o.w, o.h);

            // subtle highlight
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1;
            ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        }

        // =========================
        // LINK (UI CARD)
        // =========================
        if (o.type === "link") {

            ctx.fillStyle = "#1f2937";
            ctx.fillRect(o.x, o.y, o.w, o.h);

            ctx.strokeStyle = "#374151";
            ctx.lineWidth = 3;
            ctx.strokeRect(o.x, o.y, o.w, o.h);

            // glow accent
            ctx.strokeStyle = "rgba(0, 245, 255, 0.25)";
            ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);

            // text style
            ctx.fillStyle = "#f9fafb";
            ctx.font = "500 12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            function wrapText(text, x, y, maxWidth, lineHeight) {
                const words = text.split(" ");
                let line = "";
                let lines = [];

                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + " ";
                    const testWidth = ctx.measureText(testLine).width;

                    if (testWidth > maxWidth && i > 0) {
                        lines.push(line);
                        line = words[i] + " ";
                    } else {
                        line = testLine;
                    }
                }

                lines.push(line);

                const totalHeight = lines.length * lineHeight;
                let startY = y - totalHeight / 2 + lineHeight / 2;

                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(
                        lines[i].trim(),
                        x,
                        startY + i * lineHeight
                    );
                }
            }

            wrapText(
                o.text,
                o.x + o.w / 2,
                o.y + o.h / 2,
                o.w - 10,
                13
            );
        }

        // =========================
        // TEXT
        // =========================
        if (o.type === "text") {
            ctx.fillStyle = "#d1d5db";
            ctx.font = "16px Space Grotesk, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(o.text, o.x - 150, o.y);
        }

        // =========================
        // TITLE (H2 STYLE)
        // =========================
        if (o.type === "title") {

            ctx.fillStyle = "#ffcc00";
            ctx.font = "bold 18px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";

            ctx.shadowColor = "rgba(255, 204, 0, 0.35)";
            ctx.shadowBlur = 10;

            ctx.textAlign = "center";
            ctx.fillText(o.text, o.x, o.y);

            ctx.shadowBlur = 0;
        }
    }

    // =========================
    // PLAYER
    // =========================
    drawPlayer();

    ctx.restore();
}

function drawPlayer() {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    const radius = player.w / 2;

    // =====================
    // BODY (neon red passend bij UI)
    // =====================

    ctx.shadowColor = "rgba(255, 80, 120, 0.6)";
    ctx.shadowBlur = 12;

    ctx.fillStyle = "#ff3b5c"; // zachter neon rood (past beter bij dark UI)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // outline (past bij je cards / links borders)
    ctx.strokeStyle = "#374151"; // zelfde als je UI cards
    ctx.lineWidth = 2;
    ctx.stroke();

    // =====================
    // GLANS (subtieler, UI-achtig)
    // =====================

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(centerX - radius / 3, centerY - radius / 3, radius / 2.5, 0, Math.PI * 2);
    ctx.fill();

    // =====================
    // EYES (zelfde gedrag, maar clean UI stijl)
    // =====================

    const eyeOffsetY = -radius / 4;
    const eyeOffsetX = radius / 3;

    const eyeRadius = radius / 5;
    const pupilRadius = radius / 10;

    let eyeDir = 0;

    const movingLeft =
        keys["a"] ||
        keys["arrowleft"] ||
        touchControls.left ||
        player.vx < -0.1;

    const movingRight =
        keys["d"] ||
        keys["arrowright"] ||
        touchControls.right ||
        player.vx > 0.1;

    if (movingLeft) {
        eyeDir = -radius / 3;
    } else if (movingRight) {
        eyeDir = radius / 3;
    }

    function drawEye(x, y) {
        // oogwit (clean off-white i.p.v. hard wit)
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath();
        ctx.arc(x + eyeDir, y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#1f2937"; // match platform dark borders
        ctx.lineWidth = 1;
        ctx.stroke();

        // pupil (donker UI zwart)
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(x + eyeDir, y, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    const eyeY = centerY + eyeOffsetY;

    drawEye(centerX - eyeOffsetX, eyeY);
    drawEye(centerX + eyeOffsetX, eyeY);
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

function triggerFadeReset() {
    isFading = true;

    fadeOverlay.classList.add("active");

    setTimeout(() => {
        // reset speler positie
        player.x = 750;
        player.y = 510;
        player.vx = 0;
        player.vy = 0;

        // camera reset (optioneel maar voelt beter)
        camera.x = 0;
        camera.y = 0;

        // fade out
        fadeOverlay.classList.remove("active");

        setTimeout(() => {
            isFading = false;
        }, 600);

    }, 600);
}

function gamepadScrollLoop() {
    const gp = getGamepad();

    if (gp && !isGame) {

        const y = gp.axes[1];

        if (Math.abs(y) > 0.15) {
            scrollSpeed += y * scrollAcceleration;
        } else {
            scrollSpeed *= scrollFriction;
        }

        scrollSpeed = Math.max(-maxScrollSpeed, Math.min(maxScrollSpeed, scrollSpeed));

        window.scrollBy(0, scrollSpeed);

        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;

        if (dpadUp) window.scrollBy(0, -6);
        if (dpadDown) window.scrollBy(0, 6);
    }

    requestAnimationFrame(gamepadScrollLoop);
}

gamepadScrollLoop();

const leftBtn = document.getElementById("dpadLeft");
const rightBtn = document.getElementById("dpadRight");
const upBtn = document.getElementById("dpadUp");
const downBtn = document.getElementById("dpadDown");

function bindHold(button, key) {

    const start = (e) => {
        e.preventDefault();
        touchControls[key] = true;
    };

    const end = (e) => {
        e.preventDefault();
        touchControls[key] = false;
    };

    button.addEventListener("touchstart", start);
    button.addEventListener("touchend", end);

    button.addEventListener("mousedown", start);
    button.addEventListener("mouseup", end);
    button.addEventListener("mouseleave", end);
}

bindHold(leftBtn, "left");
bindHold(rightBtn, "right");

upBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mobileJump();
});

upBtn.addEventListener("mousedown", mobileJump);

downBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mobileInteract();
});

downBtn.addEventListener("mousedown", mobileInteract);