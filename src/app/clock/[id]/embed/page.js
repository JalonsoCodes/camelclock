import { notFound } from "next/navigation";
import EmbedMode from "@/components/EmbedMode";
import EmbedShell from "@/components/EmbedShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_THEMES = ["dark"];
const VALID_CARDS = ["transparent"];

function noFlashScript(embedTheme, embedCard) {
    let script = 'document.body.classList.add("embed-mode");';
    if (embedTheme === "dark") {
        script += 'document.documentElement.classList.add("dark");';
    }
    if (embedCard === "transparent") {
        script += 'document.body.classList.add("embed-transparent");';
    }
    return script;
}

export default async function EmbedPage({ params, searchParams }) {
    const { id } = await params;
    const { theme, card } = await searchParams;

    const legacy = theme === "transparent";
    const embedTheme = legacy || !VALID_THEMES.includes(theme) ? "light" : theme;
    const embedCard = legacy ? "transparent" : VALID_CARDS.includes(card) ? card : "card";

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
                <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme, "card") }} />
                <EmbedMode theme={embedTheme} card="card" />
                <div className="embed-disabled-card nbtc">
                    <p>This CamelClock&apos;s owner has disabled embedding.</p>
                    <a href={`/clock/${id}`} target="_top" className="btn-link">VIEW IT ON CAMELCLOCK</a>
                </div>
            </main>
        );
    }

    return (
        <main className="public-clock">
            <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme, embedCard) }} />
            <EmbedShell clock={clock} id={id} initialTheme={embedTheme} initialCard={embedCard} />
        </main>
    );
}
