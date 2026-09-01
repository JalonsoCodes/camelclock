import { redirect } from "next/navigation";
import DashboardView from "@/components/DashboardView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/dashboard");
    }

    const { data: clocks = [], error } = await supabase
        .from("clocks")
        .select("*")
        .eq("user_id", user.id)
        .order("target_at", { ascending: true });

    if (error) {
        console.error("Failed to load dashboard clocks:", error.message);
    }

    const { data: followedRows = [], error: followsError } = await supabase
        .from("follows")
        .select("clock_id")
        .eq("user_id", user.id);

    if (followsError) {
        console.error("Failed to load followed clocks:", followsError.message);
    }

    let followedClocks = [];
    const followedIds = (followedRows ?? []).map((row) => row.clock_id);
    if (followedIds.length > 0) {
        const { data, error: followedError } = await supabase
            .from("clocks")
            .select("*")
            .in("id", followedIds)
            .eq("status", "live")
            .order("target_at", { ascending: true });

        if (followedError) {
            console.error("Failed to load followed clock details:", followedError.message);
        } else {
            followedClocks = data ?? [];
        }
    }

    return <DashboardView clocks={clocks} followedClocks={followedClocks} />;
}
