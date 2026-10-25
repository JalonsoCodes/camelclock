import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import AdminShowcases from "@/components/AdminShowcases";

export const dynamic = "force-dynamic";

export default async function AdminShowcasesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin/showcases");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error("Failed to load admin profile:", profileError.message);
    }

    if (!profile?.is_admin) {
        redirect("/dashboard");
    }

    /* This page only orders the clocks already flagged as showcases. Flagging is
       done directly in the database (`is_showcase = true`), so the page never
       lists clocks that are not already committed to the landing. */
    const { data: clocks = [], error: clocksError } = await supabase
        .from("clocks")
        .select("id, title, target_at, hydrate_count, hydrator_count, showcase_order")
        .eq("status", "live")
        .eq("is_showcase", true)
        .order("showcase_order", { ascending: true })
        .order("hydrate_count", { ascending: false });

    if (clocksError) {
        console.error("Failed to load showcase clocks:", clocksError.message);
    }

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div className="admin-link-row">
                    <Link className="pressable admin-boost-test-link" href="/admin/boost-test">
                        BOOST TEST
                    </Link>
                    <Link className="pressable admin-boost-test-link" href="/admin/reports">
                        REPORTS
                    </Link>
                </div>
            </div>
            <AdminShowcases clocks={clocks} />
        </>
    );
}
