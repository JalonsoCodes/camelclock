import DashboardView from "@/components/DashboardView";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const { data: clocks = [] } = await supabase
        .from("clocks")
        .select("*")
        .order("created_at", { ascending: false });

    return <DashboardView clocks={clocks} />;
}
