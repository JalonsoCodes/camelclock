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

    const { data: hydratedRows = [], error: hydrationsError } = await supabase
        .from("hydrations")
        .select("clock_id")
        .eq("user_id", user.id);

    if (hydrationsError) {
        console.error("Failed to load hydrated clocks:", hydrationsError.message);
    }

    const hydratedIds = (hydratedRows ?? []).map((row) => row.clock_id);

    let hydratedClocks = [];
    if (hydratedIds.length > 0) {
        const { data, error: hydratedError } = await supabase
            .from("clocks")
            .select("*")
            .in("id", hydratedIds)
            .eq("status", "live")
            .order("target_at", { ascending: true });

        if (hydratedError) {
            console.error("Failed to load hydrated clock details:", hydratedError.message);
        } else {
            hydratedClocks = data ?? [];
        }
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    return (
        <DashboardView
            clocks={clocks}
            hydratedClocks={hydratedClocks}
            emailConfirmed={Boolean(user.email_confirmed_at)}
            userEmail={user.email ?? ""}
            hasHandle={Boolean(profile?.username)}
        />
    );
}
