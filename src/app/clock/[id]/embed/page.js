import { notFound } from "next/navigation";
import EmbedShell from "@/components/EmbedShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
    robots: { index: false, follow: false },
};

const VALID_THEMES = ["light", "dark"];
const VALID_CARDS = ["transparent"];
const VALID_SIZES = ["sm", "md", "lg"];

function noFlashScript(embedTheme, embedCard, embedSize, embedNotion) {
    let script = `document.body.classList.add("embed-mode", "embed-size-${embedSize}");`;
    if (embedTheme === "dark") {
        script += 'document.documentElement.classList.add("dark");';
    }
    if (embedCard === "transparent") {
        script += 'document.body.classList.add("embed-transparent");';
    }
    if (embedNotion) {
        script += 'document.body.classList.add("embed-notion");';
    }
    return script;
}

export default async function EmbedPage({ params, searchParams }) {
    const { id } = await params;
    const { theme, card, size, notion } = await searchParams;

    const legacy = theme === "transparent";
    const embedTheme = legacy || !VALID_THEMES.includes(theme) ? "light" : theme;
    const embedCard = legacy ? "transparent" : VALID_CARDS.includes(card) ? card : "card";
    const embedSize = VALID_SIZES.includes(size) ? size : "sm";
    const embedNotion = notion === "1" || notion === "true";

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

    // An embed is a pure timer and a doorway — it never hydrates in place (see EmbedClock), so it
    // needs no entitlement read at all. A tap opens the clock's own page in a new tab instead.

    return (
        <main className="public-clock">
            <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme, embedCard, embedSize, embedNotion) }} />
            <EmbedShell clock={clock} id={id} initialTheme={embedTheme} initialCard={embedCard} initialSize={embedSize} initialNotion={embedNotion} />
        </main>
    );
}
