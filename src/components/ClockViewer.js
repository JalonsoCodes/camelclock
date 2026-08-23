"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Rocket, Share2 } from "lucide-react";
import CamelClock from "./CamelClock";
import ShareDialog from "./ShareDialog";
import AuthModal from "./auth/AuthModal";
import { formatClockTime } from "@/utils/clockValues";
import { supabase } from "@/lib/supabase/client";

export default function ClockViewer({ clock, isOwner: initialOwner }) {
    const router = useRouter();
    const [isOwner, setIsOwner] = useState(initialOwner);
    const [statusOverride, setStatusOverride] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState("");
    const [shareOpen, setShareOpen] = useState(false);
    const [shareContext, setShareContext] = useState("shared");
    const [user, setUser] = useState(null);
    const [following, setFollowing] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    const [authPromptOpen, setAuthPromptOpen] = useState(false);
    const pendingSaveRef = useRef(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    }, []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT") {
                setIsOwner(false);
                setUser(null);
                setFollowing(false);
                pendingSaveRef.current = false;
            } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                const u = session?.user ?? null;
                setUser(u);
                setIsOwner(!!u && u.id === clock.user_id);

                if (event === "SIGNED_IN" && pendingSaveRef.current && u && u.id !== clock.user_id) {
                    pendingSaveRef.current = false;
                    supabase
                        .from("follows")
                        .insert({ user_id: u.id, clock_id: clock.id })
                        .then(({ error }) => {
                            if (!error) setFollowing(true);
                        });
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [clock.user_id, clock.id]);

    useEffect(() => {
        if (!user || user.id === clock.user_id) return;

        let mounted = true;
        supabase
            .from("follows")
            .select("clock_id")
            .eq("user_id", user.id)
            .eq("clock_id", clock.id)
            .maybeSingle()
            .then(({ data }) => {
                if (mounted) setFollowing(!!data);
            });

        return () => {
            mounted = false;
        };
    }, [user, clock.id, clock.user_id]);

    const status = statusOverride ?? clock.status;
    const target = new Date(clock.target_at);

    const handlePublish = async () => {
        setPublishError("");
        setPublishing(true);
        const { error } = await supabase
            .from("clocks")
            .update({ status: "live" })
            .eq("id", clock.id);
        setPublishing(false);

        if (error) {
            console.error("Failed to publish clock:", error.message);
            setPublishError("Failed to publish. Please try again.");
            return;
        }

        setStatusOverride("live");
        setShareContext("published");
        setShareOpen(true);
        router.refresh();
    };

    const shareSubline =
        shareContext === "published"
            ? `\u201C${clock.title}\u201D is now publicly visible. Share a link or embed it anywhere.`
            : isOwner
                ? `Share your clock\u2019s link or grab the embed code.`
                : undefined;

    const handleWatermarkClick = async () => {
        if (followBusy) return;

        const { data: { user: current } } = await supabase.auth.getUser();
        if (!current) {
            pendingSaveRef.current = true;
            setAuthPromptOpen(true);
            return;
        }
        if (current.id === clock.user_id) return;

        setFollowBusy(true);
        if (following) {
            const { error } = await supabase
                .from("follows")
                .delete()
                .eq("user_id", current.id)
                .eq("clock_id", clock.id);
            if (error) {
                console.error("Failed to unsave clock:", error.message);
            } else {
                setFollowing(false);
            }
        } else {
            const { error } = await supabase
                .from("follows")
                .insert({ user_id: current.id, clock_id: clock.id });
            if (error) {
                console.error("Failed to save clock:", error.message);
            } else {
                setFollowing(true);
            }
        }
        setFollowBusy(false);
    };

    return (
        <div className="clock-viewer">
            {status === "draft" && isOwner && (
                <>
                    <div className="draft-banner-row">
                        <div className="draft-banner nbtc">
                            This CamelClock is in your Drafts &mdash; only you can see it.
                        </div>
                        <button
                            className="draft-publish-button nbtc"
                            type="button"
                            title="Make this clock publicly visible"
                            onClick={handlePublish}
                            disabled={publishing}
                        >
                            <Rocket className="button-icon" />
                            {publishing ? "PUBLISHING..." : "PUBLISH"}
                        </button>
                    </div>
                    {publishError && <p className="card-error">{publishError}</p>}
                </>
            )}

            {status === "live" && (
                <div className="clock-share-row">
                    <button
                        className="clock-share-button nbtc"
                        type="button"
                        title="Copy the link or grab the embed code"
                        onClick={() => { setShareContext("shared"); setShareOpen(true); }}
                    >
                        <Share2 className="button-icon" />
                        SHARE
                    </button>
                </div>
            )}
            <div className="public-clock-card nbtc">
                {isOwner && (
                    <Link href={`/edit/${clock.id}`} className="edit-fab nbtc" title="Edit this clock">
                        <Pencil className="button-icon" />
                        EDIT
                    </Link>
                )}
                <CamelClock
                    title={clock.title}
                    month={target.getMonth()}
                    day={target.getDate()}
                    time={formatClockTime(target)}
                    introText={clock.intro_text}
                    celebrationMessage={clock.celebration_message}
                    primaryColour={clock.primary_colour}
                    secondaryColour={clock.secondary_colour}
                    celebrationType={clock.celebration_type}
                    boosts={clock.wearables || []}
                    showWatermark
                    {...(!isOwner && status === "live"
                        ? { saved: following, onSaveClick: handleWatermarkClick }
                        : {})}
                />
            </div>

            {shareOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    onClose={() => setShareOpen(false)}
                    isOwner={isOwner}
                    allowEmbed={clock.allow_embed !== false}
                    heading={shareContext === "published" ? "YOUR CLOCK IS LIVE" : "SHARE THIS CLOCK"}
                    subline={shareSubline}
                />
            )}

            {authPromptOpen && (
                <AuthModal
                    mode="signup"
                    onClose={() => { setAuthPromptOpen(false); pendingSaveRef.current = false; }}
                    onSuccess={() => setAuthPromptOpen(false)}
                />
            )}
        </div>
    );
}
