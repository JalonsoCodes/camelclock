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

/* The owner-only RLS on clocks means an admin cannot write another user's row
   through the client. reorder_showcases is the definer RPC that lets an admin
   set the showcase order, and it re-checks the admin claim in SQL. */
export async function reorderShowcases(orderedIds) {
    try {
        const { supabase } = await requireAdmin();

        if (!Array.isArray(orderedIds)) {
            return { error: "Invalid order." };
        }

        const { error } = await supabase.rpc("reorder_showcases", {
            p_ids: orderedIds,
        });
        if (error) {
            console.error("reorderShowcases:", error);
            return { error: "Failed to reorder." };
        }

        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        console.error("reorderShowcases:", error);
        return { error: deniedOr(error, "Failed to reorder. Please try again.") };
    }
}
