const RESERVED_USERNAMES = new Set([
    "admin",
    "administrator",
    "api",
    "abuse",
    "billing",
    "camelclock",
    "contact",
    "hello",
    "help",
    "legal",
    "mod",
    "moderator",
    "official",
    "privacy",
    "security",
    "staff",
    "support",
    "team",
    "terms",
]);

export function normalizeUsername(input) {
    return (input ?? "").trim().toLowerCase();
}

export function validateUsername(input) {
    const value = normalizeUsername(input);
    if (!value) return "Enter a handle.";
    if (value.length < 3) return "Handles must be at least 3 characters.";
    if (value.length > 20) return "Handles must be 20 characters or fewer.";
    if (!/^[a-z0-9_]+$/.test(value)) return "Use only lowercase letters, numbers and underscores.";
    if (RESERVED_USERNAMES.has(value)) return "That handle is reserved.";
    return null;
}