import { notFound } from "next/navigation";
import CamelClock from "@/components/CamelClock";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function PublicClockPage({ params }) {
    const { id } = await params;

    const { data: clock } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!clock) {
        notFound();
    }

    const target = new Date(clock.target_at);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    return (
        <main className="public-clock">
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
                />
            </div>
        </main>
    );
}
