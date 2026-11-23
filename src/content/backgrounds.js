/* Background presets. `id` is load-bearing: keep stable.
   Each background has a light (pastel) and dark variant defined as CSS variables in globals.css. */

export const BACKGROUNDS = [
    { id: "red", label: "RED" },
    { id: "orange", label: "ORANGE" },
    { id: "yellow", label: "YELLOW" },
    { id: "green", label: "GREEN" },
    { id: "blue", label: "BLUE" },
    { id: "indigo", label: "INDIGO" },
    { id: "violet", label: "VIOLET" },
];

export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));

export function getBackgroundBgVar(id) {
    return BACKGROUND_BY_ID[id] ? `var(--background-${id}-bg)` : null;
}
