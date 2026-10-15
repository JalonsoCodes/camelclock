import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import BoostTestHarness from "@/components/BoostTestHarness";

export const dynamic = "force-dynamic";

export default async function BoostTestPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin/boost-test");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        redirect("/dashboard");
    }

    return (
        <>
            <Navbar />
            <BoostTestHarness />
        </>
    );
}