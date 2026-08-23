"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CamelClock from "./CamelClock";
import AuthModal from "./auth/AuthModal";
import { formatClockTime } from "@/utils/clockValues";
import { supabase } from "@/lib/supabase/client";

export default function TemplateCard({ template }) {
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [addError, setAddError] = useState(false);
    const pendingSaveRef = useRef(false);
    const target = new Date(template.target_at);
    const time = formatClockTime(target);

    const addTemplateClock = async (userId) => {
        const { data, error } = await supabase
            .from("clocks")
            .insert([{
                title: template.title,
                target_at: template.target_at,
                intro_text: template.intro_text,
                celebration_message: template.celebration_message,
                primary_colour: template.primary_colour,
                secondary_colour: template.secondary_colour,
                celebration_type: template.celebration_type,
                user_id: userId,
            }])
            .select();

        if (error) {
            console.error("Error saving template:", error.message);
            setAddError(true);
            return;
        }

        router.push(`/clock/${data[0].id}`);
    };

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" && pendingSaveRef.current) {
                pendingSaveRef.current = false;
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) addTemplateClock(user.id);
                });
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    /* eslint-enable react-hooks/exhaustive-deps */

    const handleSaveClick = async () => {
        setAddError(false);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            pendingSaveRef.current = true;
            setAuthOpen(true);
            return;
        }

        await addTemplateClock(user.id);
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
                showWatermark
                onSaveClick={handleSaveClick}
            />
            {addError && (
                <p className="card-error">Couldn&apos;t save this clock. Please try again.</p>
            )}
            {authOpen && (
                <AuthModal
                    mode="signup"
                    onClose={() => { setAuthOpen(false); pendingSaveRef.current = false; }}
                    onSuccess={() => setAuthOpen(false)}
                />
            )}
        </div>
    );
}
