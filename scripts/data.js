window.GameData = {
    objects: [],
    links: []
};

window.buildWorldFromHTML = buildWorldFromHTML;

function buildWorldFromHTML() {

    const main = document.querySelector("main");

    const lanes = {
        left: 200,
        mid: 900,
        right: 1600
    };

    let y = 200;

    const objects = [];
    const links = [];

    const sections = Array.from(main.querySelectorAll("h2"));

    sections.forEach((section, index) => {

        const laneX =
            index % 3 === 0 ? lanes.left :
            index % 3 === 1 ? lanes.mid :
            lanes.right;

        // SECTION PLATFORM (H2 = anchor platform)
        objects.push({
            type: "section",
            x: laneX,
            y,
            w: 500,
            h: 50,
            text: section.textContent
        });

        y += 120;

        // LINKS eronder als platforms (NIET onder elkaar!)
        const list = section.nextElementSibling;

        if (list && list.tagName === "UL") {

            let lx = laneX - 120;

            list.querySelectorAll("a").forEach((a, i) => {

                const obj = {
                    type: "link",
                    x: lx + (i * 240),
                    y: y,
                    w: 200,
                    h: 50,
                    text: a.textContent,
                    href: a.href
                };

                objects.push(obj);
                links.push(obj);
            });

            y += 160;
        }

        y += 120;
    });

    GameData.objects = objects;
    GameData.links = links;

    console.log("WORLD BUILT (GRID MODE)", GameData);
}