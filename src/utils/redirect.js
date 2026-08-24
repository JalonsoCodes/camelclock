export function sanitizeNext(next, fallback = "/dashboard") {
    if (typeof next !== "string") return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
    return next;
}
