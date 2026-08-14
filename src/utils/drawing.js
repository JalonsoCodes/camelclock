import { eyeOne, eyeTwo, eyeThree, eyeFour } from "@/utils/grids";

export function drawCamel(canvas, template, levelNumbers, eyeFrame, scale, primaryColour, secondaryColour, pixelDark = "#000000") {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const newCamel = template.map(row => [...row]);
    // Shifted startRow to 60 to allow 60-pixel tall humps to build upwards
    const startRow = 60;
    const numHumps = levelNumbers.length;
    const humpWidth = numHumps ** 2 - 11 * numHumps + 40;
    const totalWidthOfHumps = humpWidth * numHumps;
    let startCol = 21 + (50 - totalWidthOfHumps) / 2;

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
                    // Left 1px shadow except on bottom row
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

    // Eyes shifted down by +36 rows (13 + 36 = 49)
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            newCamel[49 + r][9 + c] = currentEye[r][c];
        }
    }

    for (let r = 0; r < newCamel.length; r++) {
        for (let c = 0; c < newCamel[0].length; c++) {
            const colourIndex = newCamel[r][c];
            if (colourIndex === 1) {
                ctx.fillStyle = pixelDark;
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