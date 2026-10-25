import { camelTemplate, eyeOne, eyeTwo, eyeThree, eyeFour, wearables as wearableData } from "@/utils/grids";

const CTA_ICON_BOX = (() => {
    let minR = Infinity;
    let minC = Infinity;
    let maxR = -1;
    let maxC = -1;
    for (let r = 0; r < camelTemplate.length; r++) {
        for (let c = 0; c < camelTemplate[r].length; c++) {
            if (camelTemplate[r][c] !== 9) continue;
            minR = Math.min(minR, r);
            minC = Math.min(minC, c);
            maxR = Math.max(maxR, r);
            maxC = Math.max(maxC, c);
        }
    }
    return maxR < 0 ? null : { row: minR, col: minC, rows: maxR - minR + 1, cols: maxC - minC + 1 };
})();

const CTA_ICONS = {
    open: [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0],
        [0, 0, 0, 1, 1, 0],
        [0, 0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
    ],
};

function applyCtaIcon(grid, icon) {
    const glyph = CTA_ICONS[icon];
    if (!glyph || !CTA_ICON_BOX) return grid;

    let hasPlus = false;
    for (let r = 0; r < CTA_ICON_BOX.rows && !hasPlus; r++) {
        for (let c = 0; c < CTA_ICON_BOX.cols; c++) {
            if (grid[CTA_ICON_BOX.row + r]?.[CTA_ICON_BOX.col + c] === 9) {
                hasPlus = true;
                break;
            }
        }
    }
    if (!hasPlus) return grid;

    for (let r = 0; r < CTA_ICON_BOX.rows; r++) {
        for (let c = 0; c < CTA_ICON_BOX.cols; c++) {
            const targetRow = CTA_ICON_BOX.row + r;
            const targetCol = CTA_ICON_BOX.col + c;
            if (grid[targetRow]?.[targetCol] === undefined) continue;
            if (glyph[r]?.[c]) {
                grid[targetRow][targetCol] = 9;
            } else if (grid[targetRow][targetCol] === 9) {
                grid[targetRow][targetCol] = 2;
            }
        }
    }
    return grid;
}

export function buildCamelGrid(template, levelNumbers, eyeFrame, ctaIcon = null) {
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

    applyCtaIcon(newCamel, ctaIcon);

    return newCamel;
}

function readWaterColour() {
    if (typeof document === "undefined") return "#4FC3F7";
    return getComputedStyle(document.documentElement).getPropertyValue("--water-colour").trim() || "#4FC3F7";
}

function readCssVar(name) {
    if (typeof document === "undefined") return "#000000";
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000000";
}

/* A wearable's colour map may hold plain hex or a CSS custom-property name (e.g.
   "--wearable-ink") so dark items can lighten with the theme. Resolve once per
   draw, never per pixel. */
export function resolveWearableColours(colours) {
    const out = {};
    for (const key of Object.keys(colours)) {
        const value = colours[key];
        out[key] = typeof value === "string" && value.startsWith("--") ? readCssVar(value) : value;
    }
    return out;
}

function boostIconColour(ctaState, primaryColour, pixelDark) {
    if (ctaState === "hydrating") return readWaterColour();
    if (ctaState === "hover" || ctaState === "active") return pixelDark;
    if (ctaState === "idle") return isLightColour(primaryColour) ? lightenHex(primaryColour, 0.35) : darkenHex(primaryColour, 0.35);
    return primaryColour;
}

export function blendHex(a, b, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const parse = (hex) => {
        const clean = hex.replace("#", "");
        if (clean.length !== 6) return null;
        const num = parseInt(clean, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };
    const ca = parse(a);
    const cb = parse(b);
    if (!ca || !cb) return a;
    const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
    return `#${((out[0] << 16) | (out[1] << 8) | out[2]).toString(16).padStart(6, "0")}`;
}

// A water-blue front that radiates out from the camel's own centre and washes over every drawn
// pixel it reaches. It returns a per-pixel shade fn so it composes with the effect loop, and it
// only ever recolours pixels the grid already has — nothing is drawn outside the camel.
export function makeHydrationShade(grid, spread, strength = 1) {
    const b = contentBounds(grid);
    if (!b) return (fill) => fill;
    const water = readWaterColour();
    const cx = (b.minC + b.maxC) / 2;
    const cy = (b.minR + b.maxR) / 2;
    const maxR = Math.max(1, Math.hypot(Math.max(cx - b.minC, b.maxC - cx), Math.max(cy - b.minR, b.maxR - cy)));
    const radius = Math.max(0, Math.min(1, spread)) * maxR;
    const amount = Math.max(0, Math.min(1, strength)) * 0.8;
    return (fill, r, c) => {
        if (Math.hypot(c - cx, r - cy) > radius) return fill;
        return blendHex(fill, water, amount);
    };
}

export function drawCamel(canvas, template, levelNumbers, eyeFrame, scale, primaryColour, secondaryColour, pixelDark = "#000000", ctaState = null, ctaIcon = null) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const newCamel = buildCamelGrid(template, levelNumbers, eyeFrame, ctaIcon);

    drawGrid(canvas, newCamel, scale, primaryColour, secondaryColour, pixelDark, boostIconColour(ctaState, primaryColour, pixelDark));
}

function jumpDynamics(t, p) {
    const { crouchEnd, airEnd, bounceEnd, crouchDepth, peak, bouncePeak } = p;
    let dy = 0;
    let airU = -1;
    if (t < crouchEnd) {
        dy = crouchDepth * (t / crouchEnd);
    } else if (t < airEnd) {
        airU = (t - crouchEnd) / (airEnd - crouchEnd);
        dy = crouchDepth - peak * 4 * airU * (1 - airU);
    } else if (t < bounceEnd) {
        const u = (t - airEnd) / (bounceEnd - airEnd);
        dy = crouchDepth - bouncePeak * 4 * u * (1 - u);
    } else {
        const u = (t - bounceEnd) / (1 - bounceEnd);
        dy = crouchDepth * (1 - u);
    }
    return { dy, airU };
}

function tuckAngle(u) {
    return 2 * Math.PI * (u + 0.1 * Math.sin(2 * Math.PI * u));
}

export function makeShineShade(rows, cols, progress) {
    const sTotal = (rows - 1) + (cols - 1);
    const bandHalf = 5.5;
    const travel = sTotal + bandHalf * 2;
    const sCenter = -bandHalf + travel * progress;
    return (fill, r, c) => {
        const d = Math.abs(r + c - sCenter);
        if (d > bandHalf) return fill;
        const strength = d <= bandHalf * 0.5 ? 0.5 : d <= bandHalf * 0.8 ? 0.3 : 0.12;
        return lightenHex(fill, strength);
    };
}

const smoothstep = (x) => {
    const c = Math.max(0, Math.min(1, x));
    return c * c * (3 - 2 * c);
};

function sunRadius(profile = {}) {
    return Math.max(2, Math.round(profile.radius ?? 2.5));
}

function sunCentreCol(progress, cols, radius) {
    const u = Math.max(0, Math.min(1, progress));
    return -radius - 1 + (cols + radius * 2 + 2) * u;
}

// The sun drags a warm wash across the pixels it passes over, so it reads as light falling on
// the camel rather than a disc sliding in front of it.
export function makeSunShade(progress, cols, profile = {}) {
    const centre = sunCentreCol(progress, cols, sunRadius(profile));
    return (fill, r, c) => {
        const d = Math.abs(c - centre);
        if (d > 4.5) return fill;
        return lightenHex(fill, d <= 2 ? 0.34 : d <= 3.5 ? 0.18 : 0.08);
    };
}

// Weather bodies are keyed off the camel so a wide animal and a narrow one get the same
// relative composition. Descent steps come off the def's frame count, so every drawn element
// moves a fixed number of pixels per frame.
export function drawSun(ctx, grid, scale, progress, profile = {}) {
    const b = contentBounds(grid);
    if (!b) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const radius = sunRadius(profile);
    const lift = Math.max(0, Math.round(profile.lift ?? 0));
    const midR = Math.max(radius + 1, Math.min(rows - radius - 1, Math.round(rows * 0.15) - lift));
    const topRow = midR - radius;
    const midC = Math.round(sunCentreCol(progress, cols, radius));

    ctx.fillStyle = profile.glow ?? "#FFE082";
    for (let r = topRow - 1; r <= topRow + radius * 2 + 1; r++) {
        for (let c = midC - radius - 1; c <= midC + radius + 1; c++) {
            const d = Math.hypot(c - midC, (r - midR) * 1.15);
            if (d <= radius + 1.6) ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }

    ctx.fillStyle = profile.colour ?? "#FFC93C";
    for (let r = topRow; r <= topRow + radius * 2; r++) {
        for (let c = midC - radius; c <= midC + radius; c++) {
            if (Math.hypot(c - midC, r - midR) <= radius + 0.35) {
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }

    ctx.fillStyle = profile.core ?? "#FF9F1C";
    for (let r = topRow + 1; r <= topRow + radius * 2 - 1; r++) {
        for (let c = midC - radius + 1; c <= midC + radius - 1; c++) {
            if (Math.hypot(c - midC, r - midR) <= radius - 0.9) {
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }

    const rays = Math.max(4, radius * 4);
    const reach = Math.max(1, Math.round(profile.rayLen ?? 1.6));
    for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + Math.PI / rays;
        const r0 = radius + 1;
        const r1 = radius + reach;
        ctx.fillStyle = profile.ray ?? "#FFD54F";
        for (let t = r0; t <= r1; t++) {
            const rc = Math.round(midC + Math.cos(angle) * t);
            const rr = Math.round(midR + Math.sin(angle) * t * 1.1);
            if (rr < 0 || rr >= rows || rc < 0 || rc >= cols) continue;
            ctx.fillRect(rc * scale, rr * scale, scale, scale);
        }
    }

    ctx.imageSmoothingEnabled = false;
}

// One cloud built from three overlapping lobes sitting on a flat base, so the top edge is
// bumpy and the underside is a straight shaded line. Coordinates are grid cells; the caller
// bakes them to pixels with scale.
function drawPuffyCloud(ctx, scale, x0, y0, w, h, colour, shadeColour) {
    const lobes = [
        { dx: -0.26, dy: 0.14, rx: 0.34, ry: 0.52 },
        { dx: 0.00, dy: 0.00, rx: 0.40, ry: 0.60 },
        { dx: 0.28, dy: 0.16, rx: 0.30, ry: 0.48 },
    ];
    const baseTop = y0 + h * 0.52;
    const baseLeft = x0 + w * 0.08;
    const baseRight = x0 + w * 0.92;
    const shadeFrom = y0 + h - 1.5;

    for (let r = 0; r < h; r++) {
        const gy = y0 + r;
        for (let c = 0; c < w; c++) {
            const gx = x0 + c;
            let inside = gy >= baseTop && gx >= baseLeft && gx <= baseRight;
            if (!inside) {
                for (const L of lobes) {
                    const px = x0 + w * (0.5 + L.dx);
                    const py = y0 + h * (0.5 + L.dy);
                    const rx = w * L.rx;
                    const ry = h * L.ry;
                    if (((gx - px) / rx) ** 2 + ((gy - py) / ry) ** 2 <= 1) {
                        inside = true;
                        break;
                    }
                }
            }
            if (!inside) continue;
            ctx.fillStyle = gy >= shadeFrom ? shadeColour : colour;
            ctx.fillRect(Math.round(gx) * scale, Math.round(gy) * scale, scale, scale);
        }
    }
}

// The cloud is pinned to the very top of the canvas and drawn behind the camel (CamelClock
// renders it before drawCamelBoost, like the sun). A few discrete puffy clouds, spread across
// the camel's width, rather than one flat band.
export function drawRainCloud(ctx, grid, scale, profile = {}) {
    const b = contentBounds(grid);
    if (!b) return;
    const cols = grid[0].length;
    const clouds = Math.max(1, Math.round(profile.clouds ?? 1));
    const cloudW = Math.max(6, Math.round(profile.cloudWidth ?? 12));
    const cloudH = Math.max(3, Math.round(profile.cloudRows ?? 4));
    const lift = Math.max(0, Math.round(profile.lift ?? 0));
    const cloudColour = profile.cloud ?? "#B0BEC5";
    const cloudShade = profile.cloudShade ?? "#78909C";

    const contentW = b.maxC - b.minC + 1;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < clouds; i++) {
        const cx = b.minC + contentW * ((i + 0.5) / clouds);
        const x0 = Math.max(0, Math.min(cols - cloudW, Math.round(cx - cloudW / 2)));
        drawPuffyCloud(ctx, scale, x0, lift, cloudW, cloudH, cloudColour, cloudShade);
    }
}

// Drops fall from just under the cloud to the ground and are drawn in front of the camel
// (CamelClock renders them after drawCamelBoost), so the rain reads as pouring between the
// viewer and the camel.
export function drawRainDrops(ctx, grid, scale, progress, profile = {}) {
    const b = contentBounds(grid);
    if (!b) return;
    const u = Math.max(0, Math.min(1, progress));
    const drops = Math.max(3, profile.drops ?? 10);
    const dropLen = Math.max(1, profile.dropLen ?? 2);
    const cloudH = Math.max(3, Math.round(profile.cloudRows ?? 4));
    const lift = Math.max(0, Math.round(profile.lift ?? 0));
    const top = lift + cloudH;
    const floor = b.maxR + 2;
    const span = Math.max(1, floor - top);
    const left = b.minC - 1;
    const width = b.maxC - b.minC + 3;
    const speed = Math.max(0.25, profile.dropSpeed ?? 1);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = profile.drop ?? "#4FC3F7";
    for (let i = 0; i < drops; i++) {
        const c = left + 1 + ((i * 7) % Math.max(1, width - 2));
        const offset = ((i * 3) % 5) / 5;
        const head = top + (span + dropLen + 1) * (((u * speed) + offset) % 1);
        for (let d = 0; d < dropLen; d++) {
            const r = Math.round(head + d);
            if (r < 0 || r > floor) continue;
            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
}

export function drawSandstorm(ctx, grid, scale, progress, profile = {}) {
    const b = contentBounds(grid);
    if (!b) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const u = Math.max(0, Math.min(1, progress));
    const bands = Math.max(2, profile.bands ?? 3);
    const grains = Math.max(6, profile.grains ?? 24);
    const grainWidth = Math.max(1, profile.grainWidth ?? 3);
    const speed = Math.max(0.1, profile.speed ?? 1);
    const peakAlpha = Math.max(0.1, profile.peakAlpha ?? 0.85);
    const depth = b.maxR - b.minR + 1;
    const travel = cols + grainWidth + 4;

    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < grains; i++) {
        const c = -grainWidth + travel * (((u * speed) + (i * 7) / grains) % 1);
        const lane = ((i * 5) % bands) / bands;
        const r = Math.round(b.minR - 1 + depth * lane + Math.sin((i + u * 4) * 1.7) * 1.2);
        if (r < 0 || r >= rows) continue;
        ctx.globalAlpha = peakAlpha;
        ctx.fillStyle = profile.grain ?? "#E6C288";
        for (let w = 0; w < grainWidth; w++) {
            const cc = Math.round(c + w);
            if (cc < 0 || cc >= cols) continue;
            ctx.fillRect(cc * scale, r * scale, scale, scale);
        }
    }

    // Denser, dimmer sheets behind the grains so the camel is progressively buried rather
    // than just being speckled. The sand travels horizontally: each body row carries a few
    // dashes that chase each other across the camel and wrap, which reads as a gust sweeping
    // sideways instead of the dotted vertical columns a per-pixel veil produced.
    const veil = Math.min(0.72, peakAlpha * Math.min(1, u / 0.45) * 0.82);
    if (veil > 0.02) {
        ctx.globalAlpha = veil;
        ctx.fillStyle = profile.veil ?? "#D9B26A";
        const drift = u * speed * 2;
        const width = b.maxC - b.minC + 3;
        const dashes = 3;
        for (let r = b.minR - 1; r <= b.maxR + 1; r++) {
            if (r < 0 || r >= rows) continue;
            const rowPhase = (r * 0.618) % 1;
            const dashLen = 4 + ((r * 7) % 5);
            for (let d = 0; d < dashes; d++) {
                const t = (drift + rowPhase + d / dashes) % 1;
                const startC = Math.round(b.minC - 1 + width * t);
                for (let w = 0; w < dashLen; w++) {
                    const c = startC + w;
                    if (c < 0 || c >= cols) continue;
                    ctx.fillRect(c * scale, r * scale, scale, scale);
                }
            }
        }
    }
    ctx.globalAlpha = 1;
}

export function contentBounds(grid) {
    const rows = grid.length;
    const cols = grid[0].length;
    let minR = rows;
    let minC = cols;
    let maxR = -1;
    let maxC = -1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0) continue;
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
        }
    }
    if (maxR < 0 || maxC < 0) return null;
    return { minR, minC, maxR, maxC };
}

export function drawSparkles(ctx, grid, scale, progress, colour) {
    const cols = grid[0].length;
    const b = contentBounds(grid);
    if (!b) return;
    const midR = Math.floor((b.minR + b.maxR) / 2);
    const midC = Math.floor((b.minC + b.maxC) / 2);
    const candidates = [
        { r: Math.max(1, b.minR - 3), c: Math.max(1, b.minC - 2) },
        { r: Math.max(1, b.minR - 5), c: midC },
        { r: Math.max(1, b.minR - 2), c: Math.min(cols - 1, b.maxC + 1) },
        { r: midR, c: Math.max(1, b.minC - 4) },
        { r: midR, c: Math.min(cols - 1, b.maxC + 4) },
        { r: Math.max(1, b.minR + 2), c: Math.max(1, b.minC - 3) },
    ].filter((s) => grid[s.r]?.[s.c] === 0);
    const shift = Math.floor(progress * candidates.length);
    ctx.fillStyle = colour;
    ctx.imageSmoothingEnabled = false;
    candidates.forEach((s, i) => {
        const on = ((i * 37 + shift * 13) % 5) < 2;
        if (!on) return;
        const px = s.c * scale;
        const py = s.r * scale;
        const size = scale * 0.5;
        const pad = scale * 0.25;
        ctx.fillRect(px + pad, py + pad, size, size);
        ctx.fillRect(px + pad, py + pad - scale * 0.5, size, size);
        ctx.fillRect(px + pad, py + pad + scale * 0.5, size, size);
        ctx.fillRect(px + pad - scale * 0.5, py + pad, size, size);
        ctx.fillRect(px + pad + scale * 0.5, py + pad, size, size);
    });
}

export function drawFireworks(ctx, grid, scale, progress, colours) {
    const b = contentBounds(grid);
    if (!b) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const palette = colours && colours.length ? colours : ["#FF5252", "#FFD54F", "#4FC3F7", "#BA68C8", "#4DB6AC"];
    const u = Math.max(0, Math.min(1, progress));
    const cx = ((b.minC + b.maxC) / 2) * scale;
    const cy = ((b.minR + b.maxR) / 2) * scale;
    const spread = Math.min((b.maxC - b.minC) * scale, (b.maxR - b.minR) * scale) * 0.95;
    const sparks = 12;
    const size = Math.max(1, scale * 0.5);
    const pad = scale * 0.25;
    ctx.imageSmoothingEnabled = false;

    const flash = u < 0.1 ? 1 - u / 0.1 : 0;
    if (flash > 0) {
        ctx.globalAlpha = flash * 0.5;
        ctx.fillStyle = palette[0];
        const flashSize = scale * 2.2 * flash;
        ctx.fillRect(cx - flashSize / 2, cy - flashSize / 2, flashSize, flashSize);
        ctx.globalAlpha = 1;
    }

    for (let i = 0; i < sparks; i++) {
        const angle = i * 2.399963;
        const lag = (i % 4) * 0.045;
        const t = Math.max(0, Math.min(1, (u - lag) / Math.max(1e-3, 1 - lag)));
        const grow = smoothstep(Math.min(1, t / 0.6));
        const fade = t <= 0 ? 0 : Math.max(0, 1 - Math.max(0, (t - 0.35) / 0.65));
        if (grow <= 0 || fade <= 0) continue;
        const radius = spread * grow * (0.8 + (0.3 * ((i * 53) % 7)) / 7);
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (px <= 0 || py <= 0 || px >= cols * scale || py >= rows * scale) continue;
        ctx.globalAlpha = Math.min(1, fade);
        ctx.fillStyle = palette[i % palette.length];
        const bx = px - pad - scale * 0.25;
        const by = py - pad - scale * 0.25;
        ctx.fillRect(bx + pad, by + pad, size, size);
        ctx.fillRect(bx + pad, by + pad - scale * 0.5, size, size);
        ctx.fillRect(bx + pad, by + pad + scale * 0.5, size, size);
        ctx.fillRect(bx + pad - scale * 0.5, by + pad, size, size);
        ctx.fillRect(bx + pad + scale * 0.5, by + pad, size, size);
    }

    ctx.globalAlpha = 1;
}

export function drawCamelBoost(canvas, grid, scale, primaryColour, secondaryColour, pixelDark = "#000000", t = 0, ctaState = null, def = null, overlayShade = null, wearables = []) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rows = grid.length;
    const cols = grid[0].length;

    let minR = rows;
    let minC = cols;
    let maxR = -1;
    let maxC = -1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 0) continue;
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
        }
    }
    if (maxR < 0 || maxC < 0) return;

    const contentW = maxC - minC + 1;
    const contentH = maxR - minR + 1;
    const cx = minC + contentW / 2;
    const cy = minR + contentH / 2;

const anim = def?.anim ?? "spin";

    let rot = 0;
    let dx = 0;
    let dy = 0;
    let pivot = null;
    let rowScale = null;

    if (anim === "spin") {
        const profile = def?.profile ?? { crouchEnd: 0.1, airEnd: 0.62, bounceEnd: 0.78, crouchDepth: 2, peak: 11, bouncePeak: 4 };
        const { dy: jdy, airU } = jumpDynamics(t, profile);
        dy = jdy;
        if (airU >= 0) rot = tuckAngle(airU);
    } else if (anim === "hop") {
        dy = jumpDynamics(t, { crouchEnd: 0.12, airEnd: 0.58, bounceEnd: 0.75, crouchDepth: 2, peak: 9, bouncePeak: 3 }).dy;
    } else if (anim === "pushup") {
        const p = def?.profile ?? { formEnd: 0.3, holdEnd: 0.62, peakRot: 0.3, sink: 1.5, pivotX: 0.27, pivotY: 0.9 };
        const u = Math.min(1, Math.max(0, t));
        let tension;
        if (u <= p.formEnd) {
            tension = u / p.formEnd;
        } else if (u <= p.holdEnd) {
            tension = 1;
        } else {
            tension = 1 - (u - p.holdEnd) / Math.max(1e-3, 1 - p.holdEnd);
        }
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, tension)));
        rot = -p.peakRot * eased;
        dy = p.sink * eased;
        pivot = { x: p.pivotX, y: p.pivotY };
    } else if (anim === "jack") {
        const p = def?.profile ?? { crouchEnd: 0.14, airEnd: 0.5, bounceEnd: 0.75, crouchDepth: 2, peak: 10, bouncePeak: 3, legSplit: 0.68, legSpread: 1.7, reps: 2 };
        const reps = Math.max(1, Math.round(p.reps ?? 2));
        const ph = (Math.min(1, Math.max(0, t)) * reps) % 1;
        const d = jumpDynamics(ph, p);
        dy = d.dy;
        const airFrac = d.airU >= 0 ? Math.sin(Math.PI * Math.min(1, Math.max(0, d.airU))) : 0;
        const spread = Math.min(2, Math.max(1, p.legSpread ?? 1));
        rowScale = (r) => {
            const legRow = minR + contentH * Math.min(1, Math.max(0, p.legSplit ?? 0.7));
            if (r < legRow) return 1;
            const depth = Math.min(1, (r - legRow) / Math.max(1, maxR - legRow));
            return 1 + (spread - 1) * airFrac * (0.3 + 0.7 * depth);
        };
    }

    const cosA = Math.cos(-rot);
    const sinA = Math.sin(-rot);

    const cw = contentW * Math.abs(cosA) + contentH * Math.abs(sinA);
    const ch = contentW * Math.abs(sinA) + contentH * Math.abs(cosA);
    const shrink = Math.min(1, Math.min(cols, rows) / Math.max(cw, ch));
    const invSX = 1 / Math.max(shrink, 1e-3);
    const invSY = invSX;

const px = pivot ? minC + pivot.x * contentW : cx;
    const py = pivot ? minR + pivot.y * contentH : cy;

    const iconColour = boostIconColour(ctaState, primaryColour, pixelDark);

    const srcColour = Array.from({ length: rows }, (_, r) => {
        const rowColours = new Array(cols);
        for (let c = 0; c < cols; c++) {
            const idx = grid[r][c];
            let fill = null;
            if (idx === 1) fill = pixelDark;
            else if (idx === 2) fill = primaryColour;
            else if (idx === 3) fill = secondaryColour;
            else if (idx === 4) fill = "#525129";
            else if (idx === 9) fill = iconColour;
            rowColours[c] = fill;
        }
        return rowColours;
    });

    if (wearables.length > 0) {
        const bgColour = getComputedStyle(document.documentElement).getPropertyValue("--card-colour").trim() || "#ffffff";
        for (const wearableId of wearables) {
            const wearable = wearableData[wearableId];
            if (!wearable) continue;
            const { grid: wgrid, colours } = wearable;
            const wColours = resolveWearableColours(colours);
            const positions = wearable.positions || [wearable.anchor, wearable.mirrorAnchor].filter(Boolean);
            for (const pos of positions) {
                for (let r = 0; r < wgrid.length; r++) {
                    for (let c = 0; c < wgrid[r].length; c++) {
                        const idx = wgrid[r][c];
                        if (idx === 0) continue;
                        const fill = idx === 100 ? bgColour : wColours[idx];
                        if (!fill) continue;
                        const rr = pos.row + r;
                        const cc = pos.col + c;
                        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                            srcColour[rr][cc] = fill;
                        }
                    }
                }
            }
        }
    }

    ctx.imageSmoothingEnabled = false;
    for (let r = 0; r < rows; r++) {
        const rowInv = rowScale ? 1 / Math.max(1e-3, rowScale(r)) : invSX;
        for (let c = 0; c < cols; c++) {
            const xr = c - px - dx;
            const yr = r - py - dy;
            const rx = xr * cosA - yr * sinA;
            const ry = xr * sinA + yr * cosA;
            const x = rx * rowInv;
            const y = ry * invSY;
            const srcC = Math.round(x + px);
            const srcR = Math.round(y + py);
            if (srcR < 0 || srcR >= rows || srcC < 0 || srcC >= cols) continue;
            const fill = srcColour[srcR][srcC];
            if (!fill) continue;
            ctx.fillStyle = overlayShade ? overlayShade(fill, r, c) : fill;
            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
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

export function drawGrid(canvas, grid, scale, primaryColour, secondaryColour, pixelDark = "#000000", iconColour = null, shadeCell = null) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const colourIndex = grid[r][c];
            let fillStyle;
            if (colourIndex === 1) {
                fillStyle = pixelDark;
            } else if (colourIndex === 2) {
                fillStyle = primaryColour;
            } else if (colourIndex === 3) {
                fillStyle = secondaryColour;
            } else if (colourIndex === 4) {
                fillStyle = "#525129";
            } else if (colourIndex === 9 && iconColour) {
                fillStyle = iconColour;
            } else {
                continue;
            }
            if (shadeCell) {
                fillStyle = shadeCell(fillStyle, r, c);
            }
            ctx.fillStyle = fillStyle;
            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
}

export function drawWearables(canvas, wearableIds, scale) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const bgColour = getComputedStyle(document.documentElement).getPropertyValue("--card-colour").trim() || "#ffffff";

    for (const wearableId of wearableIds) {
        const wearable = wearableData[wearableId];
        if (!wearable) continue;

        const { grid, colours } = wearable;
        const wColours = resolveWearableColours(colours);
        const positions = wearable.positions || [wearable.anchor, wearable.mirrorAnchor].filter(Boolean);

        for (const pos of positions) {
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const idx = grid[r][c];
                    if (idx === 0) continue;
                    const fill = idx === 100 ? bgColour : wColours[idx];
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
