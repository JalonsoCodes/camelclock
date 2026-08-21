const MAX_TITLE = 72;
const MAX_LABEL = 15;
const MAX_MESSAGE = 140;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function validateClock(values) {
    const errors = [];

    const title = (values.title ?? "").trim();
    if (!title) {
        errors.push("Title is required.");
    } else if (title.length > MAX_TITLE) {
        errors.push(`Title must be ${MAX_TITLE} characters or fewer.`);
    }

    if ((values.introText ?? "").length > MAX_LABEL) {
        errors.push(`Label must be ${MAX_LABEL} characters or fewer.`);
    }

    if ((values.celebrationMessage ?? "").length > MAX_MESSAGE) {
        errors.push(`Completion message must be ${MAX_MESSAGE} characters or fewer.`);
    }

    if (values.month == null || values.month < 0 || values.month > 11) {
        errors.push("Please select a valid month.");
    }

    if (values.day == null || values.day < 1 || values.day > 31) {
        errors.push("Please enter a valid day (1-31).");
    }

    const time = values.time ?? "";
    if (!TIME_PATTERN.test(time)) {
        errors.push("Please enter a valid time.");
    }

    if (!HEX_PATTERN.test(values.primaryColour ?? "")) {
        errors.push("Primary colour is not a valid hex colour.");
    }

    if (!HEX_PATTERN.test(values.secondaryColour ?? "")) {
        errors.push("Secondary colour is not a valid hex colour.");
    }

    return { valid: errors.length === 0, errors };
}
