export const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatClockTime(target) {
    return `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;
}

export function formatFinishRow(target) {
    return `${target.getDate()} ${MONTHS[target.getMonth()]} ${target.getFullYear()} · ${formatClockTime(target)}`;
}
