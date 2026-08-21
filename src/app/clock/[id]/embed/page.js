import { notFound } from "next/navigation";
import CamelClock from "@/components/CamelClock";
import EmbedMode from "@/components/EmbedMode";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EmbedPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: clock } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!clock) {
        notFound();
    }

    if (clock.status !== "live") {
        notFound();
    }

    const target = new Date(clock.target_at);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    return (
        <main className="public-clock">
            <EmbedMode />
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
                />
            </div>
        </main>
    );
}
