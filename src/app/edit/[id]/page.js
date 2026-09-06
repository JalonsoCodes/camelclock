import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Edit CamelClock",
    description: "Edit your CamelClock",
};

export default async function EditClockPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=/edit/${id}`);
    }

    const { data: clock } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!clock || clock.user_id !== user.id) {
        notFound();
    }

    return (
        <>
            <Navbar />
            <main className="live-clock">
                <div className="clock-viewer">
                    <CamelClockBuilder
                        initialClock={clock}
                        clockId={id}
                    />
                </div>
            </main>
        </>
    );
}
