export const LIVE_COUNT_EVENT = "camelclock:livecount-changed";

export function refreshLiveCount() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(LIVE_COUNT_EVENT));
    }
}