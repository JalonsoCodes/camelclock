import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import AdminReports from "@/components/AdminReports";

export const dynamic = "force-dynamic";

function formatWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default async function AdminReportsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin/reports");
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

    const { data, error: reportsError } = await supabase.rpc("get_clock_reports");

    if (reportsError) {
        console.error("Failed to load clock reports:", reportsError.message);
    }

    const reports = (data ?? []).map((report) => ({
        ...report,
        when: formatWhen(report.created_at),
    }));

    return (
        <>
            <Navbar />
            <AdminReports reports={reports} />
        </>
    );
}
