// Cookieless product analytics via Umami Cloud.
//
// The script is injected in layout.js only when NEXT_PUBLIC_UMAMI_WEBSITE_ID is set, so this
// wrapper no-ops in local dev (and on any deploy where a blocker ate the script). It must never
// throw into a caller's flow, and it must never carry personal data: event names are fixed and
// data is ids/booleans only. Never pass an email, a handle, a title, or any clock field value.

export function track(event, data) {
    if (typeof window === "undefined") return;
    try {
        window.umami?.track(event, data);
    } catch {
        // analytics must never break a user flow
    }
}
