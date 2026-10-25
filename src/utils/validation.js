import { wearables, BOOSTS } from "./grids";
import { cleanText } from "./text";

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

export function validateBoosts(boostList) {
    if (boostList == null) return null;
    if (!Array.isArray(boostList)) {
        return "Invalid boosts selection.";
    }
    const seen = new Set();
    for (const entry of boostList) {
        if (entry == null || typeof entry !== "object") {
            return "Invalid boosts selection.";
        }
        const def = BOOSTS[entry.id];
        if (!def || def.reactive) return "Unknown boost.";
        if (seen.has(entry.id)) {
            return "Duplicate boost.";
        }
        seen.add(entry.id);
    }
    return null;
}

// The stored order is the clock's own reveal ladder: two entries per level reached, drawn
// round-robin so each pair spans two categories. Only ids that exist and could actually be
// revealed are accepted, and a repeat means the client is trying to hand one clock two copies
// of the same unlock.
export function validateBoostOrder(order) {
    if (order == null) return null;
    if (!Array.isArray(order)) {
        return "Invalid boost order.";
    }
    const seen = new Set();
    for (const entry of order) {
        const id = typeof entry === "string" ? entry : entry?.id;
        const def = BOOSTS[id];
        if (!def || def.reactive || def.startsUnlocked) return "Unknown boost.";
        if (seen.has(id)) return "Duplicate boost.";
        seen.add(id);
    }
    return null;
}

export function validateClock(values) {
    const errors = [];

    const title = cleanText(values.title);
    const introText = cleanText(values.introText);
    const celebrationMessage = cleanText(values.celebrationMessage);

    if (!title) {
        errors.push("Title is required.");
    } else if (title.length > MAX_TITLE) {
        errors.push(`Title must be ${MAX_TITLE} characters or fewer.`);
    }

    if (introText.length > MAX_LABEL) {
        errors.push(`Label must be ${MAX_LABEL} characters or fewer.`);
    }

    if (celebrationMessage.length > MAX_MESSAGE) {
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

    const boostsError = validateBoosts(values.boosts);
    if (boostsError) {
        errors.push(boostsError);
    }

    const boostOrderError = validateBoostOrder(values.boostOrder);
    if (boostOrderError) {
        errors.push(boostOrderError);
    }

    if (values.viewerHydrates != null && typeof values.viewerHydrates !== "boolean") {
        errors.push("Viewers-can-hydrate setting is invalid.");
    }

    return { valid: errors.length === 0, errors };
}
