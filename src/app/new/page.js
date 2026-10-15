import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ClockCreationWizard from "@/components/ClockCreationWizard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewClockPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/new");
    }

    return (
        <>
            <Navbar />
            <main>
                <h2 className="page-heading">NEW CLOCK</h2>
                <ClockCreationWizard />
            </main>
        </>
    );
}
