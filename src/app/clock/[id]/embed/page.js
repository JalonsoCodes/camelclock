import { notFound } from "next/navigation";
import EmbedShell from "@/components/EmbedShell";
import { createClient } from "@/lib/supabase/server";
import { dailyDropQuota, computeDropLeft } from "@/utils/boost";

export const dynamic = "force-dynamic";

const VALID_THEMES = ["dark"];
const VALID_CARDS = ["transparent"];
const VALID_SIZES = ["sm", "md", "lg"];

function noFlashScript(embedTheme, embedCard, embedSize) {
    let script = `document.body.classList.add("embed-mode", "embed-size-${embedSize}");`;
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
    const { theme, card, size } = await searchParams;

    const legacy = theme === "transparent";
    const embedTheme = legacy || !VALID_THEMES.includes(theme) ? "light" : theme;
    const embedCard = legacy ? "transparent" : VALID_CARDS.includes(card) ? card : "card";
    const embedSize = VALID_SIZES.includes(size) ? size : "sm";

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

    // A signed-in visitor's embed taps draw on the same shared daily pool, so hand the embed the
    // caller's remaining drop up front rather than letting it start from 0 and block the first tap.
    const { data: { user } } = await supabase.auth.getUser();
    const entitlements = user
        ? await (async () => {
              const { data: uh } = await supabase
                  .from("user_hydrates")
                  .select("drop_day, drop_used")
                  .eq("user_id", user.id)
                  .maybeSingle();
              return {
                  drop: computeDropLeft(uh?.drop_day, uh?.drop_used) ?? dailyDropQuota(),
              };
          })()
        : {};

    return (
        <main className="public-clock">
            <script dangerouslySetInnerHTML={{ __html: noFlashScript(embedTheme, embedCard, embedSize) }} />
            <EmbedShell clock={clock} id={id} initialTheme={embedTheme} initialCard={embedCard} initialSize={embedSize} entitlements={entitlements} />
        </main>
    );
}
