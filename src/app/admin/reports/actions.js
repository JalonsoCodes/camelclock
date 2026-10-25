"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    if (!profile?.is_admin) {
        throw new Error("Forbidden");
    }

    return { supabase };
}

function deniedOr(error, fallback) {
    const message = error?.message ?? "";
    if (message === "Unauthorized" || message === "Forbidden") {
        return "You are not authorized to do that.";
    }
    return fallback;
}

export async function resolveReport(reportId, status) {
    try {
        const { supabase } = await requireAdmin();

        if (typeof reportId !== "string" || !["resolved", "dismissed"].includes(status)) {
            return { error: "Invalid report." };
        }

        const { error } = await supabase.rpc("resolve_clock_report", {
            p_report_id: reportId,
            p_status: status,
        });
        if (error) {
            console.error("resolveReport:", error);
            return { error: "Failed to update report." };
        }

        revalidatePath("/admin/reports");
        return { ok: true };
    } catch (error) {
        console.error("resolveReport:", error);
        return { error: deniedOr(error, "Failed to update report. Please try again.") };
    }
}
