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

    const { data: clocks = [] } = await supabase
        .from("clocks")
        .select("*")
        .eq("user_id", user.id)
        .order("target_at", { ascending: true });

    return <DashboardView clocks={clocks} />;
}
