let canPressA = true;

let scrollSpeed = 0;
const maxSpeed = 5;      // lager = trager scrollen
const acceleration = 0.15; // hoe snel stick opbouwt
const friction = 0.85;     // hoe snel het afremt

function getGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let gp of gamepads) {
        if (gp) return gp;
    }
    return null;
}

function update() {
    const gp = getGamepad();
    if (!gp) {
        requestAnimationFrame(update);
        return;
    }

    // =========================
    // 🎮 LEFT STICK VERTICAL SCROLL
    // =========================
    const y = gp.axes[1];

    if (Math.abs(y) > 0.15) {
        scrollSpeed += y * acceleration;
    } else {
        scrollSpeed *= friction;
    }

    scrollSpeed = Math.max(-maxSpeed, Math.min(maxSpeed, scrollSpeed));

    window.scrollBy(0, scrollSpeed);

    // =========================
    // 🧭 D-PAD (extra scroll control)
    // =========================
    const dpadUp = gp.buttons[12]?.pressed;
    const dpadDown = gp.buttons[13]?.pressed;

    if (dpadUp) window.scrollBy(0, -6);
    if (dpadDown) window.scrollBy(0, 6);

    // =========================
    // 🅰️ BUTTON A → BACK TO INDEX
    // =========================
    if (gp.buttons[0].pressed && canPressA) {
        canPressA = false;
        window.location.href = "../index.html";
    }

    if (!gp.buttons[0].pressed) {
        canPressA = true;
    }

    requestAnimationFrame(update);
}

// Start zodra controller verbonden is
window.addEventListener("gamepadconnected", () => {
    console.log("🎮 Controller connected");
    update();
});