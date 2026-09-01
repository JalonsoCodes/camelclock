import { redirect } from "next/navigation";
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

    const { data: showcases = [], error: showcasesError } = await supabase
        .from("showcases")
        .select("*")
        .order("sort_order");

    if (showcasesError) {
        console.error("Failed to load showcases:", showcasesError.message);
    }

    return (
        <>
            <Navbar />
            <AdminShowcases showcases={showcases} />
        </>
    );
}
