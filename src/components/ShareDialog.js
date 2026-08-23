"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";
import SocialShareRow from "./SocialShareRow";
import OptionSlider from "./OptionSlider";
import { supabase } from "@/lib/supabase/client";

export default function ShareDialog({
    clockId,
    title,
    onClose,
    isOwner = false,
    allowEmbed = true,
    heading = "YOUR CLOCK IS READY",
    subline,
}) {
    const router = useRouter();
    const [copied, setCopied] = useState(null);
    const [embedAllowed, setEmbedAllowed] = useState(allowEmbed);
    const [embedTheme, setEmbedTheme] = useState("light");
    const [togglingEmbed, setTogglingEmbed] = useState(false);
    const trapRef = useFocusTrap(true);

    const shareUrl = `${window.location.origin}/clock/${clockId}`;
    const embedSrc = `${shareUrl}/embed${embedTheme === "light" ? "" : `?theme=${embedTheme}`}`;
    const embedStyleAttr = embedTheme === "transparent" ? "border:0;background:transparent;" : "border:0;";
    const embedCode = `<iframe src="${embedSrc}" width="100%" height="560" frameborder="0" style="${embedStyleAttr}" title="${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}"></iframe>`;

    const resolvedSubline =
        subline ??
        (embedAllowed
            ? `\u201C${title}\u201D has been saved. Share a link or embed it anywhere.`
            : `Copy the link to share \u201C${title}\u201D.`);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const copy = async (type, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const handleToggleEmbed = async (next) => {
        setTogglingEmbed(true);
        const { error } = await supabase
            .from("clocks")
            .update({ allow_embed: next })
            .eq("id", clockId);
        setTogglingEmbed(false);

        if (error) {
            console.error("Failed to update embed setting:", error.message);
            return;
        }

        setEmbedAllowed(next);
        router.refresh();
    };

    return createPortal(
        <div className="share-dialog-overlay" onClick={onClose}>
            <div className="share-dialog nbtc" ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                    <X aria-hidden="true" />
                </button>
                <h2 className="share-dialog-title" id="share-dialog-title">{heading}</h2>
                <p className="share-dialog-subtitle">{resolvedSubline}</p>

                <div className="share-field">
                    <span className="share-field-label">SHARE LINK</span>
                    <div className="share-field-row nbtc">
                        <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                            <button
                                className="share-copy-button"
                                type="button"
                                title="Copy to clipboard"
                                onClick={() => copy("link", shareUrl)}
                            >
                            {copied === "link" ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                            {copied === "link" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                <SocialShareRow url={shareUrl} title={title} />

                {embedAllowed && (
                    <div className="share-field">
                        <span className="share-field-label">EMBED CODE</span>
                        <div className="share-field-row nbtc">
                            <input readOnly value={embedCode} onFocus={(e) => e.target.select()} />
                            <button
                                className="share-copy-button"
                                type="button"
                                title="Copy to clipboard"
                                onClick={() => copy("embed", embedCode)}
                            >
                                {copied === "embed" ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                                {copied === "embed" ? "Copied!" : "Copy"}
                            </button>
                        </div>
                        <div className="share-theme-picker">
                            <span className="share-field-label">STYLE</span>
                            <OptionSlider
                                ariaLabel="Embed style"
                                options={[
                                    { value: "light", label: "LIGHT" },
                                    { value: "dark", label: "DARK" },
                                    { value: "transparent", label: "TRANSPARENT" },
                                ]}
                                value={embedTheme}
                                onChange={setEmbedTheme}
                            />
                        </div>
                    </div>
                )}

                {isOwner && (
                    <div className="share-embed-toggle">
                        <div className="share-embed-toggle-text">
                            <span className="share-field-label">ENABLE EMBEDDING</span>
                            <p className="share-embed-hint">
                                When OFF, nobody can embed this clock on their site &mdash; including you.
                            </p>
                        </div>
                        <OptionSlider
                            ariaLabel="Embedding"
                            options={[
                                { value: false, label: "OFF" },
                                { value: true, label: "ON" },
                            ]}
                            value={embedAllowed}
                            onChange={handleToggleEmbed}
                            disabled={togglingEmbed}
                        />
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
