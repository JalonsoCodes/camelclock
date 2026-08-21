import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ClockViewer from "@/components/ClockViewer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: clock } = await supabase
        .from("clocks")
        .select("title")
        .eq("id", id)
        .maybeSingle();

    return {
        title: clock?.title ?? "Clock",
        description: clock?.title
            ? `Countdown to ${clock.title} — created on CamelClock`
            : "View this countdown clock on CamelClock",
    };
}

export default async function ClockPage({ params }) {
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

    const {
        data: { user },
    } = await supabase.auth.getUser();

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
