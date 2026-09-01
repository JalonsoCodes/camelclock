import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import LandingHero from "@/components/LandingHero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create a Countdown Clock",
  description:
    "Design and share embeddable countdown clocks with pixel-art camels. Free for personal use.",
};

function makeFallbackPresets() {
    const targetAt = new Date(Date.now() + 17 * 86400000 + 10 * 3600000 + 28 * 60000 + 10 * 1000).toISOString();
    return [
        { title: "My Amazing Promotion", primaryColour: "#DBB279", secondaryColour: "#8E652C", introText: "in", wearables: [], celebrationMessage: "TIME IS UP!", celebrationType: "spit", targetAt },
        { title: "Summer Sale", primaryColour: "#FF6B6B", secondaryColour: "#C92A2A", introText: "in", wearables: [], celebrationMessage: "TIME IS UP!", celebrationType: "spit", targetAt },
        { title: "Grand Opening", primaryColour: "#51CF66", secondaryColour: "#2B8A3E", introText: "in", wearables: [], celebrationMessage: "TIME IS UP!", celebrationType: "spit", targetAt },
        { title: "Product Launch", primaryColour: "#339AF0", secondaryColour: "#1864AB", introText: "in", wearables: [], celebrationMessage: "TIME IS UP!", celebrationType: "spit", targetAt },
        { title: "Flash Sale", primaryColour: "#FF922B", secondaryColour: "#D9480F", introText: "in", wearables: [], celebrationMessage: "TIME IS UP!", celebrationType: "spit", targetAt },
    ];
}

async function getPresets() {
    try {
        const supabase = await createClient();
        const { data: showcases } = await supabase
            .from("showcases")
            .select("title, target_at, intro_text, celebration_message, celebration_type, primary_colour, secondary_colour, wearables")
            .order("sort_order");

        if (!showcases || showcases.length === 0) return makeFallbackPresets();

        return showcases.map((s) => ({
            title: s.title,
            primaryColour: s.primary_colour,
            secondaryColour: s.secondary_colour,
            introText: s.intro_text,
            wearables: s.wearables ?? [],
            celebrationMessage: s.celebration_message,
            celebrationType: s.celebration_type,
            targetAt: s.target_at,
        }));
    } catch {
        return makeFallbackPresets();
    }
}

export default async function Home() {
  const presets = await getPresets();

  return (
    <>
      <Navbar />
      <main>
        <LandingHero presets={presets} />
        <Features />
        <Pricing />
      </main>
    </>
  )
}
