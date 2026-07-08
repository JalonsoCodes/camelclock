export function drawCamel(canvas, template, levels, scale) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const newCamel = template.map(row => [...row]);

    const startRow = 24
    const humpWidth = 10
    const numHumps = levels.length;
    const humpSpacing = Math.floor(54 / numHumps) - humpWidth;
    
    let startCol = 18 + Math.round((54 - (numHumps * humpWidth + (numHumps - 1) * humpSpacing)) / 2);

    levels.forEach(level => {
        const getHumpGrid = (level) => {
            if (level === 0) {
                return [
                    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
                ];
            } else if (level === 1) {
                return [
                    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
                    [1, 1, 2, 2, 2, 2, 2, 2, 1, 1]
                ];
            } else if (level === 2) {
                return [
                    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
                    [1, 1, 2, 2, 2, 2, 2, 2, 1, 1]
                ];
            } else {
                let tempHump = [
                    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0]
                ]
                for (let h = 0; h <= level - 3; h++) {
                    tempHump.push([0, 1, 2, 2, 2, 2, 2, 2, 1, 0]);
                }
                tempHump.push([1, 2, 2, 2, 2, 2, 2, 2, 2, 1]);

                return tempHump;
            }
        }

        const hump = getHumpGrid(level);
        const humpHeight = hump.length;

        for (let r = 0; r < humpHeight; r++) {
            for (let c = 0; c < hump[r].length; c++) {
                newCamel[startRow - (humpHeight - 1) + r][startCol + c] = hump[r][c];
            }
        }
        startCol += humpWidth + humpSpacing;
    });

    for (let r = 0; r < newCamel.length; r++) {
        for (let c = 0; c < newCamel[0].length; c++) {
            const colourIndex = newCamel[r][c];
            if (colourIndex === 1) {
                ctx.fillStyle = "#000000";
            } else if (colourIndex === 2) {
                ctx.fillStyle = "#DBB279";
            } else if (colourIndex === 3) {
                ctx.fillStyle = "#8E652C";
            } else {
                continue;
            }

            ctx.fillRect(c * scale, r * scale, scale, scale);
        }
    }
}