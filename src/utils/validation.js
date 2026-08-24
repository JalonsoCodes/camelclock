import { wearables } from "./grids";

const MAX_TITLE = 72;
const MAX_LABEL = 15;
const MAX_MESSAGE = 140;

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export function validateWearables(wearableIds) {
    if (wearableIds == null) return null;
    if (!Array.isArray(wearableIds)) {
        return "Invalid wearables selection.";
    }
    const seenCategories = new Set();
    for (const id of wearableIds) {
        const item = wearables[id];
        if (!item) {
            return "Unknown wearable.";
        }
        if (seenCategories.has(item.category)) {
            return "Only one wearable per slot.";
        }
        seenCategories.add(item.category);
    }
    return null;
}

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

    const wearablesError = validateWearables(values.wearables);
    if (wearablesError) {
        errors.push(wearablesError);
    }

    return { valid: errors.length === 0, errors };
}
