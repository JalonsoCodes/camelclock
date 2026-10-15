export function parseTime(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

export function pad2(value) {
    return String(value).padStart(2, "0");
}

export function parseClockTime(value) {
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(value || "");
    if (!match) return { h24: 0, m: 0 };
    return { h24: Number(match[1]) % 24, m: Number(match[2]) % 60 };
}

export function to12h(h24) {
    const h = h24 % 12;
    return h === 0 ? 12 : h;
}

export function to24h(h12, meridiem) {
    const base = h12 % 12;
    return meridiem === "PM" ? base + 12 : base;
}

export function meridiemOf(h24) {
    return h24 >= 12 ? "PM" : "AM";
}

export function formatDisplayTime(value, mode) {
    const { h24, m } = parseClockTime(value);
    const hour = mode === "12" ? to12h(h24) : h24;
    return `${pad2(hour)}:${pad2(m)}`;
}

export function formatTypingTime(digits) {
    if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`;
    if (digits.length >= 4) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    return digits;
}

export function normaliseTimeInput(text, mode, meridiem) {
    const digits = String(text || "").replace(/\D/g, "").slice(0, 4);
    if (!digits) return null;
    let hour;
    let minute;
    if (digits.length <= 2) {
        hour = Number(digits);
        minute = 0;
    } else if (digits.length === 3) {
        hour = Number(digits[0]);
        minute = Number(digits.slice(1));
    } else {
        hour = Number(digits.slice(0, 2));
        minute = Number(digits.slice(2, 4));
    }
    minute = Math.min(59, minute);
    let h24;
    if (mode === "12") {
        if (hour === 0) hour = 12;
        if (hour > 12) hour = 12;
        h24 = to24h(hour, meridiem);
    } else {
        h24 = Math.min(23, hour);
    }
    return `${pad2(h24)}:${pad2(minute)}`;
}

export function detectHourCycle() {
    try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().hourCycle;
        if (resolved === "h11" || resolved === "h12") return "12";
        return "24";
    } catch {
        return "24";
    }
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
