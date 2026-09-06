"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Pencil, Rocket, UserPlus } from "lucide-react";
import CamelClock from "./CamelClock";
import ShareDialog from "./ShareDialog";
import SocialShareRow from "./SocialShareRow";
import EmbedHelpModal from "./EmbedHelpModal";
import AuthModal from "./auth/AuthModal";
import { formatClockTime } from "@/utils/clockValues";
import { checkLiveLimit, MAX_LIVE_CLOCKS } from "@/utils/liveLimit";
import WaitlistModal from "./WaitlistModal";
import { refreshLiveCount } from "@/utils/liveCountEvents";
import { supabase } from "@/lib/supabase/client";

export default function ClockViewer({ clock, isOwner: initialOwner, justCreated = false }) {
    const router = useRouter();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com").replace(/\/+$/, "");
    const [isOwner, setIsOwner] = useState(initialOwner);
    const [statusOverride, setStatusOverride] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState("");
    const [shareOpen, setShareOpen] = useState(justCreated);
    const [shareGoLive, setShareGoLive] = useState(justCreated);
    const [shareContext, setShareContext] = useState("shared");
    const [proOpen, setProOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [following, setFollowing] = useState(false);
    const [followBusy, setFollowBusy] = useState(false);
    const [authPromptOpen, setAuthPromptOpen] = useState(false);
    const [embedHelpOpen, setEmbedHelpOpen] = useState(false);
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

    useEffect(() => {
        if (!justCreated) return;
        window.history.replaceState(null, "", `/clock/${clock.id}`);
    }, [justCreated, clock.id]);

    const handlePublish = async () => {
        setPublishError("");
        setPublishing(true);

        const check = await checkLiveLimit();
        if (!check.ok) {
            setPublishing(false);
            if (check.reason === "limit") {
                setProOpen(true);
            } else {
                setPublishError(check.error);
            }
            return;
        }

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
        setShareGoLive(false);
        setShareOpen(true);
        refreshLiveCount();
        router.refresh();
    };

    const shareSubline =
        shareContext === "published"
            ? `\u201C${clock.title}\u201D is now publicly visible. Share a link or embed it anywhere.`
            : isOwner
                ? `Share your clock\u2019s link or grab the embed code.`
                : undefined;

    const handleFollowToggle = async () => {
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
                    {!isOwner && (
                        <button
                            className={`follow-button nbtc${following ? " following" : ""}`}
                            type="button"
                            title={following ? "Stop following this CamelClock" : "Follow this CamelClock"}
                            onClick={handleFollowToggle}
                            disabled={followBusy}
                        >
                            {following ? <Check className="button-icon" /> : <UserPlus className="button-icon" />}
                            {followBusy ? "..." : following ? "FOLLOWING" : "FOLLOW"}
                        </button>
                    )}
                    <SocialShareRow
                        url={`${siteUrl}/clock/${clock.id}`}
                        title={clock.title}
                        targetDate={clock.target_at}
                        showLabel={false}
                        onNotion={() => setEmbedHelpOpen(true)}
                        onMore={() => { setShareContext("shared"); setShareGoLive(false); setShareOpen(true); }}
                    />
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
                    targetAt={clock.target_at}
                    introText={clock.intro_text}
                    celebrationMessage={clock.celebration_message}
                    primaryColour={clock.primary_colour}
                    secondaryColour={clock.secondary_colour}
                    celebrationType={clock.celebration_type}
                    boosts={clock.wearables || []}
                    showWatermark
                    {...(!isOwner && status === "live"
                        ? { showCta: true, ctaActive: following, onCtaClick: handleFollowToggle }
                        : {})}
                />
            </div>

            {shareOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    onClose={() => { setShareOpen(false); setShareGoLive(false); }}
                    isOwner={isOwner}
                    allowEmbed={clock.allow_embed !== false}
                    status={status}
                    allowGoLive={shareGoLive}
                    {...(shareGoLive ? {} : {
                        heading: shareContext === "published" ? "YOUR CLOCK IS LIVE" : "SHARE THIS CLOCK",
                        subline: shareSubline,
                    })}
                />
            )}

            {embedHelpOpen && (
                <EmbedHelpModal
                    url={`${siteUrl}/clock/${clock.id}/embed`}
                    onClose={() => setEmbedHelpOpen(false)}
                />
            )}

            {proOpen && (
                <WaitlistModal
                    heading="YOU'VE HIT THE FREE LIMIT"
subline={`Free covers ${MAX_LIVE_CLOCKS} live Camel Clocks. Pro lifts the cap \u2014 join the waitlist for early access.`}
highlightFeature="Unlimited Active Camel Clocks"
                    onClose={() => setProOpen(false)}
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
