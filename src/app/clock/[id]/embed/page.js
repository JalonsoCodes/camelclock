import { notFound } from "next/navigation";
import CamelClock from "@/components/CamelClock";
import EmbedMode from "@/components/EmbedMode";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_THEMES = ["dark", "transparent"];

function noFlashScript(embedTheme) {
    let script = 'document.body.classList.add("embed-mode");';
    if (embedTheme === "dark") {
        script += 'document.documentElement.classList.add("dark");';
    }
    if (embedTheme === "transparent") {
        script += 'document.body.classList.add("embed-transparent");';
    }
    return script;
}

export default async function EmbedPage({ params, searchParams }) {
    const { id } = await params;
    const { theme } = await searchParams;
    const embedTheme = VALID_THEMES.includes(theme) ? theme : "light";

    const supabase = await createClient();

    const { data: clock, error } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(`Failed to load embed clock ${id}:`, error.message);
    }

    if (!clock) {
        notFound();
    }

    if (clock.status !== "live") {
        notFound();
    }

    if (!clock.allow_embed) {
        return (
            <main className="public-clock">
                <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme) }} />
                <EmbedMode theme={embedTheme} />
                <div className="embed-disabled-card nbtc">
                    <p>This CamelClock&apos;s owner has disabled embedding.</p>
                    <a href={`/clock/${id}`} target="_top" className="btn-link">VIEW IT ON CAMELCLOCKS</a>
                </div>
            </main>
        );
    }

    const target = new Date(clock.target_at);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    return (
        <main className="public-clock">
            <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme) }} />
            <EmbedMode theme={embedTheme} />
            <div className="public-clock-card nbtc">
                <CamelClock
                    title={clock.title}
                    month={target.getMonth()}
                    day={target.getDate()}
                    time={time}
                    introText={clock.intro_text}
                    celebrationMessage={clock.celebration_message}
                    primaryColour={clock.primary_colour}
                    secondaryColour={clock.secondary_colour}
                    boosts={clock.wearables || []}
                    showWatermark
                    saveHref={`/clock/${id}`}
                />
            </div>
        </main>
    );
}
