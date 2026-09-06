const ALLOWED_SYMBOLS = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";

export const PASSWORD_RULES = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "One number", test: (p) => /\d/.test(p) },
    { label: "One symbol", test: (p) => [...p].some((ch) => ALLOWED_SYMBOLS.includes(ch)) },
];

export function validatePassword(password) {
    if (typeof password !== "string" || password.length < 8) {
        return "Password must be at least 8 characters.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must include a lowercase letter.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must include an uppercase letter.";
    }
    if (!/\d/.test(password)) {
        return "Password must include a number.";
    }
    const hasSymbol = [...password].some((ch) => ALLOWED_SYMBOLS.includes(ch));
    if (!hasSymbol) {
        return "Password must include a symbol.";
    }
    return null;
}