"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CamelClock from "./CamelClock";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";

export default function TemplateCard({ template }) {
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [copying, setCopying] = useState(false);
    const [copied, setCopied] = useState(false);

    const target = new Date(template.target_at);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    const handleAdd = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setAuthOpen(true);
            return;
        }

        setCopying(true);

        const { data, error } = await supabase.from("clocks").insert([{
            title: template.title,
            target_at: template.target_at,
            intro_text: template.intro_text,
            celebration_message: template.celebration_message,
            primary_colour: template.primary_colour,
            secondary_colour: template.secondary_colour,
            celebration_type: template.celebration_type,
            user_id: user.id,
        }]).select();

        setCopying(false);

        if (error) {
            console.error("Error copying template:", error);
            return;
        }

        setCopied(true);
        setTimeout(() => {
            router.push(`/clock/${data[0].id}`);
        }, 800);
    };

    return (
        <div className="solutions-cell nbtc">
            <CamelClock
                title={template.title}
                month={target.getMonth()}
                day={target.getDate()}
                time={time}
                introText={template.intro_text}
                celebrationMessage={template.celebration_message}
                primaryColour={template.primary_colour}
                secondaryColour={template.secondary_colour}
                celebrationType={template.celebration_type}
            />
            <button
                className="template-add-button"
                type="button"
                onClick={handleAdd}
                disabled={copying || copied}
                style={{ backgroundColor: template.primary_colour }}
            >
                {copied ? "ADDED!" : copying ? "ADDING..." : "+ ADD TO MY CLOCKS"}
            </button>

            {authOpen && (
                <AuthModal
                    mode="login"
                    onClose={() => setAuthOpen(false)}
                    onSuccess={() => { setAuthOpen(false); handleAdd(); }}
                />
            )}
        </div>
    );
}
