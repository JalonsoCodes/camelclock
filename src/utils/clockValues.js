export function formatClockTime(target) {
    return `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;
}

export function getClockInitialValues(clock) {
    const target = new Date(clock.target_at);
    return {
        title: clock.title,
        month: target.getMonth(),
        day: target.getDate(),
        time: formatClockTime(target),
        introText: clock.intro_text,
        celebrationMessage: clock.celebration_message,
        primaryColour: clock.primary_colour,
        secondaryColour: clock.secondary_colour,
        wearables: clock.wearables || [],
    };
}
