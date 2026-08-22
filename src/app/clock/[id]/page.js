import { cache } from "react";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ClockViewer from "@/components/ClockViewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const getClock = cache(async (id) => {
    const supabase = await createClient();
    const { data: clock, error } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(`Failed to load clock ${id}:`, error.message);
    }

    return clock ?? null;
});

const getCurrentUser = cache(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});

const fallbackMetadata = {
    title: "Clock",
    description: "View this countdown clock on CamelClock",
};

export async function generateMetadata({ params }) {
    const { id } = await params;

    try {
        const [clock, user] = await Promise.all([getClock(id), getCurrentUser()]);

        if (!clock) return fallbackMetadata;

        const isOwner = !!user && user.id === clock.user_id;
        if (clock.status === "draft" && !isOwner) return fallbackMetadata;

        return {
            title: clock.title ?? "Clock",
            description: clock.title
                ? `Countdown to ${clock.title} — created on CamelClock`
                : fallbackMetadata.description,
        };
    } catch (error) {
        console.error(`Failed to load metadata for clock ${id}:`, error.message);
        return fallbackMetadata;
    }
}

export default async function ClockPage({ params }) {
    const { id } = await params;

    const [clock, user] = await Promise.all([getClock(id), getCurrentUser()]);

    if (!clock) {
        notFound();
    }

    const isOwner = !!user && user.id === clock.user_id;

    if (clock.status === "draft" && !isOwner) {
        notFound();
    }

    return (
        <>
            <Navbar />
            <main className="live-clock">
                <ClockViewer clock={clock} isOwner={isOwner} />
            </main>
        </>
    );
}
