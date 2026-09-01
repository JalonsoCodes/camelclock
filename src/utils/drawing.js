import { eyeOne, eyeTwo, eyeThree, eyeFour, wearables } from "@/utils/grids";

export function buildCamelGrid(template, levelNumbers, eyeFrame) {
    const newCamel = template.map(row => [...row]);
    const startRow = 60;
    const numHumps = levelNumbers.length;
    const humpWidth = numHumps ** 2 - 11 * numHumps + 40;
    const totalWidthOfHumps = humpWidth * numHumps;
    let startCol = 22 + (50 - totalWidthOfHumps) / 2;

    levelNumbers.forEach(levelNum => {
        const getHumpGrid = (levelNum) => {
            if (levelNum <= 0) return [];

            const tempHump = Array.from({ length: levelNum }, () => Array(humpWidth).fill(0));
            const topStart = Math.floor((humpWidth - 4) / 2);
            const topEnd = topStart + 3;
            const baseStart = 1;

            if (levelNum === 1) {
                for (let x = topStart; x <= topEnd; x++) {
                    tempHump[0][x] = 1;
                }
                return tempHump;
            }

            const leftCols = new Array(levelNum);
            leftCols[0] = topStart;

            const maxRow1Start = topStart - 1;

            for (let y = 1; y < levelNum; y++) {
                if (y === levelNum - 1) {
                    leftCols[y] = baseStart;
                } else {
                    const progress = y / (levelNum - 1);
                    const curveFactor = Math.sin(progress * (Math.PI / 2));

                    let col = Math.round(topStart - (topStart - baseStart) * curveFactor);

                    if (y === 1) {
                        col = Math.min(col, maxRow1Start);
                    }

                    leftCols[y] = col;
                }
            }

            for (let y = 1; y < levelNum; y++) {
                if (leftCols[y] > leftCols[y - 1]) {
                    leftCols[y] = leftCols[y - 1];
                } else if (leftCols[y - 1] - leftCols[y] > 1) {
                    leftCols[y] = leftCols[y - 1] - 1;
                }
            }

            for (let y = 0; y < levelNum; y++) {
                const leftCol = leftCols[y];
                const rightCol = (humpWidth - 1) - leftCol;

                for (let x = leftCol + 1; x < rightCol; x++) {
                    if (x === leftCol + 1 && y < levelNum - 1) {
                        tempHump[y][x] = 3;
                    } else {
                        tempHump[y][x] = 2;
                    }
                }

                tempHump[y][leftCol] = 1;
                tempHump[y][rightCol] = 1;

                if (y === 0) {
                    for (let x = topStart; x <= topEnd; x++) {
                        tempHump[0][x] = 1;
                    }
                }
            }

            return tempHump;
        };

        const hump = getHumpGrid(levelNum + 1);
        const humpHeight = hump.length;

        for (let r = 0; r < humpHeight; r++) {
            for (let c = 0; c < hump[r].length; c++) {
                if (hump[r][c] !== 0) {
                    const targetRow = startRow - (humpHeight - 1) + r;
                    const targetCol = startCol + c;

                    newCamel[targetRow][targetCol] = hump[r][c];
                }
            }
        }
        startCol += humpWidth;
    });

    const eyeFrames = [eyeOne, eyeTwo, eyeThree, eyeFour];
    const currentEye = eyeFrames[eyeFrame];

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            newCamel[49 + r][9 + c] = currentEye[r][c];
        }
    }

    return newCamel;
}

export function drawCamel(canvas, template, levelNumbers, eyeFrame, scale, primaryColour, secondaryColour, pixelDark = "#000000", ctaState = null) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const newCamel = buildCamelGrid(template, levelNumbers, eyeFrame);

    const iconColour =
        ctaState === "hover" || ctaState === "active"
            ? pixelDark
            : ctaState === "idle"
                ? isLightColour(pixelDark)
                    ? lightenHex(primaryColour, 0.35)
                    : darkenHex(primaryColour, 0.35)
                : primaryColour;

    drawGrid(canvas, newCamel, scale, primaryColour, secondaryColour, pixelDark, iconColour);
}

export function darkenHex(hex, amount) {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;

    const num = parseInt(clean, 16);
    const r = Math.round(((num >> 16) & 255) * (1 - amount));
    const g = Math.round(((num >> 8) & 255) * (1 - amount));
    const b = Math.round((num & 255) * (1 - amount));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function lightenHex(hex, amount) {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return hex;

    const num = parseInt(clean, 16);
    const r = Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount);
    const g = Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount);
    const b = Math.round((num & 255) + (255 - (num & 255)) * amount);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function isLightColour(hex) {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return false;

    const num = parseInt(clean, 16);
    const luminance =
        (((num >> 16) & 255) * 0.299 +
        ((num >> 8) & 255) * 0.587 +
        (num & 255) * 0.114) / 255;

    return luminance > 0.5;
}

export function drawGrid(canvas, grid, scale, primaryColour, secondaryColour, pixelDark = "#000000", iconColour = null) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const colourIndex = grid[r][c];
            if (colourIndex === 1) {
                ctx.fillStyle = pixelDark;
            } else if (colourIndex === 2) {
                ctx.fillStyle = primaryColour;
            } else if (colourIndex === 3) {
                ctx.fillStyle = secondaryColour;
            } else if (colourIndex === 4) {
                ctx.fillStyle = "#525129";
            } else if (colourIndex === 9 && iconColour) {
                ctx.fillStyle = iconColour;
            } else {
                continue;
            }

            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
}

export function drawWearables(canvas, boosts, scale) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const bgColour = getComputedStyle(document.documentElement).getPropertyValue("--card-colour").trim() || "#ffffff";

    for (const boostId of boosts) {
        const wearable = wearables[boostId];
        if (!wearable) continue;

        const { grid, colours } = wearable;
        const positions = wearable.positions || [wearable.anchor, wearable.mirrorAnchor].filter(Boolean);

        for (const pos of positions) {
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const idx = grid[r][c];
                    if (idx === 0) continue;
                    const fill = idx === 100 ? bgColour : colours[idx];
                    if (!fill) continue;
                    const px = (pos.col + c) * scale;
                    const py = (pos.row + r) * scale;
                    ctx.clearRect(px, py, scale, scale);
                    ctx.fillStyle = fill;
                    ctx.fillRect(px, py, scale, scale);
                }
            }
        }
    }
}