export function normalizeUsername(input) {
    return (input ?? "").trim().toLowerCase();
}

export function validateUsername(input) {
    const value = normalizeUsername(input);
    if (!value) return "Enter a handle.";
    if (value.length < 3) return "Handles must be at least 3 characters.";
    if (value.length > 20) return "Handles must be 20 characters or fewer.";
    if (!/^[a-z0-9_]+$/.test(value)) return "Use only lowercase letters, numbers and underscores.";
    return null;
}