const INVISIBLE_TEXT =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

export function cleanText(value, { multiline = false } = {}) {
    if (typeof value !== "string") return "";

    const normalized = value
        .normalize("NFC")
        .replace(/\r\n?/g, "\n")
        .replace(INVISIBLE_TEXT, "");

    const spaced = multiline
        ? normalized.replace(/[\u2028\u2029]/g, "\n").replace(/\t/g, "    ")
        : normalized.replace(/[\t\n\u2028\u2029]+/g, " ");

    return spaced.trim();
}
