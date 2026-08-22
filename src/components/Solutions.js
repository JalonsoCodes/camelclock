import { createClient } from "@/lib/supabase/server";
import TemplateCard from "./TemplateCard";

export default async function Solutions() {
    const supabase = await createClient();

    const { data: templates, error } = await supabase
        .from("templates")
        .select("*")
        .order("template_sort_order");

    if (error) {
        console.error("Failed to load templates:", error.message);
    }

    if (!templates || templates.length === 0) return null;

    return (
        <section id="solutions">
            <h2>One CamelClock, every occasion</h2>
            <div className="solutions-grid">
                {templates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                ))}
            </div>
        </section>
    );
}
