import { redirect } from "next/navigation";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import { supabase } from "@/lib/supabaseClient";

export default async function EditClockPage({ params }) {
    const { id } = await params;

    const { data: clock } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!clock) {
        redirect("/dashboard");
    }

    const target = new Date(clock.target_at);

    const initialValues = {
        title: clock.title,
        month: target.getMonth(),
        day: target.getDate(),
        time: `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`,
        introText: clock.intro_text,
        celebrationMessage: clock.celebration_message,
        primaryColour: clock.primary_colour,
        secondaryColour: clock.secondary_colour,
    };

    return (
        <main>
            <h2 className="page-heading">EDIT CLOCK</h2>
            <CamelClockBuilder initialValues={initialValues} clockId={id} />
        </main>
    );
}
