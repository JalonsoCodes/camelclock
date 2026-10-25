import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import LandingHero from "@/components/LandingHero";
import ClockCreationWizard from "@/components/ClockCreationWizard";
import ExampleGrid from "@/components/ExampleGrid";
import Pricing from "@/components/Pricing";
import { quickStart } from "@/content/landing";
import { levelFromCount, unlockedBoostIdsFor } from "@/utils/boost";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

import { seo } from "@/content/faq";

export const metadata = {
    title: seo.homeTitle,
    description: seo.homeDescription,
    alternates: { canonical: "/" },
};

const BRAND_PRIMARY = "#DBB279";
const BRAND_SECONDARY = "#8E652C";

const SHOWCASE_COLUMNS =
    "id, title, target_at, intro_text, celebration_message, celebration_type, primary_colour, secondary_colour, wearables, boosts, boost_order, hydrate_count, level, viewer_hydrates";

/* Each fallback pairs effects with the reveal order that actually unlocks them, so the
       seeded hydrate_count the card sits at has really revealed what it is showing. The
       order spans two categories per level, matching what shuffleBoostOrder deals. */
const FALLBACK_ORDER = ["jack", "rain", "sparkle", "sun", "fireworks", "pushup", "sandstorm"];

function makeFallbackClocks() {
    const target = new Date();
    target.setDate(target.getDate() + 17);
    const iso = target.toISOString();

    return [
        ["00000000-0000-0000-0000-000000000001", "My Amazing Promotion", BRAND_PRIMARY, BRAND_SECONDARY, [{ id: "shine" }, { id: "sun" }], 50],
        ["00000000-0000-0000-0000-000000000002", "Summer Sale", "#FF6B6B", "#C92A2A", [{ id: "sparkle" }, { id: "rain" }], 50],
        ["00000000-0000-0000-0000-000000000003", "Grand Opening", "#51CF66", "#2B8A3E", [{ id: "shine" }, { id: "jack" }], 10],
        ["00000000-0000-0000-0000-000000000004", "Product Launch", "#339AF0", "#1864AB", [{ id: "fireworks" }, { id: "pushup" }], 100],
        ["00000000-0000-0000-0000-000000000005", "Flash Sale", "#FF922B", "#D9480F", [{ id: "shine" }, { id: "rain" }], 10],
    ].map(([id, title, primaryColour, secondaryColour, boosts, hydrateCount]) => {
        const level = levelFromCount(hydrateCount);
        const unlocked = unlockedBoostIdsFor(FALLBACK_ORDER, level);
        return {
            id,
            title,
            target_at: iso,
            intro_text: "in",
            celebration_message: "TIME IS UP!",
            celebration_type: "spit",
            primary_colour: primaryColour,
            secondary_colour: secondaryColour,
            wearables: [],
            boosts: boosts.filter((b) => unlocked.has(b.id)),
            boost_order: FALLBACK_ORDER,
            hydrate_count: hydrateCount,
            level,
            viewer_hydrates: false,
            /* No row to link to, so the card must not offer a view/watermark link. */
            is_fallback: true,
        };
    });
}

async function getShowcaseClocks() {
    try {
        const supabase = await createClient();
        const { data: clocks, error } = await supabase
            .from("clocks")
            .select(SHOWCASE_COLUMNS)
            .eq("is_showcase", true)
            .eq("status", "live")
            .order("showcase_order");

        /* A failed select lands here as null data, which is indistinguishable
           from an empty table and would quietly serve the hardcoded copy
           forever. Log it so a schema mismatch is visible rather than silent. */
        if (error) {
            console.error("Failed to load showcase clocks:", error.message);
        }

        if (!clocks || clocks.length === 0) return makeFallbackClocks();

        return clocks;
    } catch (error) {
        console.error("getShowcaseClocks:", error?.message ?? error);
        return makeFallbackClocks();
    }
}

export default async function Home() {
    const examples = await getShowcaseClocks();

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "CamelClock",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
            "An interactive, stylish countdown: customise a pixel camel clock, then share it or embed it on your site or Notion page.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c") }}
            />
            <Navbar />
            <main className="landing-page">
                <LandingHero />
                <ClockCreationWizard heading={quickStart.title} subheading={quickStart.subtitle} />
                <ExampleGrid clocks={examples} />
                <Pricing />
            </main>
        </>
    );
}
