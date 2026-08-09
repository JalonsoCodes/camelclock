import { eyeOne, eyeTwo, eyeThree, eyeFour } from "@/utils/grids";

export function calculateHumpMetrics(numHumps) {
    const humpWidth = 10;
    const humpSpacing = numHumps > 0 ? Math.floor(54 / numHumps) - humpWidth : 0;
    
    const startCol = 18 + Math.round((54 - (numHumps * humpWidth + (numHumps - 1) * humpSpacing)) / 2);
    const humpsSpanWidth = numHumps * humpWidth + (numHumps - 1) * humpSpacing;
    const endColSpacing = 77 - (startCol + humpsSpanWidth);

    return { startCol, humpsSpanWidth, endColSpacing, humpWidth, humpSpacing };
}

export function drawCamel(canvas, template, levelNumbers, eyeFrame, scale, primaryColour, secondaryColour) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const newCamel = template.map(row => [...row]);
    const startRow = 24;

    const numHumps = levelNumbers.length;
    let { startCol, humpWidth, humpSpacing } = calculateHumpMetrics(numHumps);

    levelNumbers.forEach(levelNum => {
        const getHumpGrid = (levelNum) => {
            if (levelNum === 0) {
                return [
                    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
                ];
            } else if (levelNum === 1) {
                return [
                    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
                    [1, 1, 3, 2, 2, 2, 2, 2, 1, 1]
                ];
            } else if (levelNum === 2) {
                return [
                    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    [0, 0, 1, 3, 2, 2, 2, 1, 0, 0],
                    [1, 1, 3, 2, 2, 2, 2, 2, 1, 1]
                ];
            } else {
                let tempHump = [
                    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    [0, 0, 1, 3, 2, 2, 2, 1, 0, 0]
                ]
                for (let h = 0; h <= levelNum - 3; h++) {
                    tempHump.push([0, 1, 3, 2, 2, 2, 2, 2, 1, 0]);
                }
                tempHump.push([1, 3, 2, 2, 2, 2, 2, 2, 2, 1]);

                return tempHump;
            }
        }

        const hump = getHumpGrid(levelNum);
        const humpHeight = hump.length;

        for (let r = 0; r < humpHeight; r++) {
            for (let c = 0; c < hump[r].length; c++) {
                newCamel[startRow - (humpHeight - 1) + r][startCol + c] = hump[r][c];
            }
        }
        startCol += humpWidth + humpSpacing;
    });

    const eyeFrames = [eyeOne, eyeTwo, eyeThree, eyeFour];
    const currentEye = eyeFrames[eyeFrame];

    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            newCamel[13 + r][9 + c] = currentEye[r][c];
        }
    }

    for (let r = 0; r < newCamel.length; r++) {
        for (let c = 0; c < newCamel[0].length; c++) {
            const colourIndex = newCamel[r][c];
            if (colourIndex === 1) {
                ctx.fillStyle = "#000000";
            } else if (colourIndex === 2) {
                ctx.fillStyle = primaryColour;
            } else if (colourIndex === 3) {
                ctx.fillStyle = secondaryColour;
            } else {
                continue;
            }

            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
}