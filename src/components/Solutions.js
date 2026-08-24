import { createClient } from "@/lib/supabase/server";
import ShowcaseCard from "./ShowcaseCard";

export default async function Solutions() {
    const supabase = await createClient();

    const { data: showcases, error } = await supabase
        .from("showcases")
        .select("*")
        .order("target_at");

    if (error) {
        console.error("Failed to load showcases:", error.message);
    }

    const linked = (showcases ?? []).filter((showcase) => showcase.clock_id);

    if (linked.length === 0) return null;

    return (
        <section id="solutions">
            <h2>One CamelClock, every occasion</h2>
            <div className="solutions-grid">
                {linked.map((showcase) => (
                    <ShowcaseCard key={showcase.id} showcase={showcase} />
                ))}
            </div>
        </section>
    );
}
