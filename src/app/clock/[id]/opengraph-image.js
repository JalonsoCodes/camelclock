import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CamelClock countdown";

async function getClock(id) {
    try {
        const supabase = await createClient();
        const { data: clock } = await supabase
            .from("clocks")
            .select("title, intro_text, celebration_message, primary_colour, secondary_colour, status")
            .eq("id", id)
            .maybeSingle();
        return clock ?? null;
    } catch {
        return null;
    }
}

export default async function Image({ params }) {
    const { id } = await params;
    const clock = await getClock(id);
    const shareable = clock && clock.status === "live";

    const title = shareable && clock.title ? clock.title.slice(0, 80) : null;
    const background =
        (shareable && HEX_PATTERN.test(clock.primary_colour ?? "") && clock.primary_colour) || "#DBB279";
    const accent =
        (shareable && HEX_PATTERN.test(clock.secondary_colour ?? "") && clock.secondary_colour) || "#8E652C";

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: background,
                    padding: 48,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 28,
                        border: "12px solid #111111",
                        boxShadow: "0 0 0 8px #ffffff",
                        padding: 64,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            fontSize: 64,
                            color: "#111111",
                            letterSpacing: 6,
                            textTransform: "uppercase",
                            fontWeight: 700,
                        }}
                    >
                        🐪 Countdown to
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: title ? 88 : 72,
                            fontWeight: 700,
                            color: "#111111",
                            textAlign: "center",
                            maxWidth: 960,
                        }}
                    >
                        {title ?? "Create a CamelClock"}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 40,
                            color: accent,
                            fontWeight: 700,
                            letterSpacing: 2,
                        }}
                    >
                        CAMELCLOCK
                    </div>
                </div>
            </div>
        ),
        size
    );
}
