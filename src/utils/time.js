export function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

export function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

export function getConfiguredTarget(month, day, time, year) {
    const { hours, minutes } = parseTime(time);
    return new Date(year, month, day, hours, minutes, 0);
}

export function getNextTarget(month, day, time) {
    const now = new Date();
    let target = getConfiguredTarget(month, day, time, now.getFullYear());

    if (target <= now) {
        target.setFullYear(now.getFullYear() + 1);
    }

    return target;
}
