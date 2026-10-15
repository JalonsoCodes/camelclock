"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Globe, X } from "lucide-react";
import { SiNotion } from "react-icons/si";
import useFocusTrap from "@/hooks/useFocusTrap";
import SocialShareRow from "./SocialShareRow";
import EmbedSiteModal from "./EmbedSiteModal";
import EmbedHelpModal from "./EmbedHelpModal";

// Two deliberately simple and distinct modes. "saved" is the confirmation that appears right
// after a clock is created as a draft - no settings, no share link (a draft isn't shareable).
// "live" is what opens after publishing (or when sharing a live clock): just the link, the
// social row, and the two embed destinations. Publishing itself is not this dialog's job - the
// PUBLISH buttons write status directly through checkLiveLimit(). There is no status toggle and
// no embed-code builder here; that lives in EmbedSiteModal / EmbedHelpModal.
export default function ShareDialog({
    clockId,
    title,
    onClose,
    heading,
    subline,
    mode = "live",
}) {
    const [copied, setCopied] = useState(null);
    const [embedSiteOpen, setEmbedSiteOpen] = useState(false);
    const [embedHelpOpen, setEmbedHelpOpen] = useState(false);
    const trapRef = useFocusTrap(true);

    const saved = mode === "saved";
    const shareUrl = `${window.location.origin}/clock/${clockId}`;
    const embedUrl = `${shareUrl}/embed`;

    const resolvedHeading = saved
        ? "YOUR CLOCK IS SAVED"
        : (heading ?? "YOUR CLOCK IS LIVE");
    const resolvedSubline = subline
        ? subline
        : saved
            ? `Saved to your drafts \u2014 only you can see it. Publish it whenever you\u2019re ready.`
            : `\u201C${title}\u201D is now publicly visible. Share a link or embed it anywhere.`;

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

    return createPortal(
        <>
            <div className="share-dialog-overlay" onClick={onClose}>
                <div className="share-dialog nbtc" ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" onClick={(e) => e.stopPropagation()}>
                    <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                        <X aria-hidden="true" />
                    </button>
                    <h2 className="share-dialog-title" id="share-dialog-title">{resolvedHeading}</h2>
                    <p className="share-dialog-subtitle">{resolvedSubline}</p>

                    {saved ? (
                        <button className="btn-link share-dialog-ok" type="button" onClick={onClose}>
                            GOT IT
                        </button>
                    ) : (
                        <>
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

                            <div className="share-embed-buttons">
                                <button
                                    className="btn-link share-embed-button"
                                    type="button"
                                    title="Get a copy-paste embed for your own site"
                                    onClick={() => setEmbedSiteOpen(true)}
                                >
                                    <Globe className="button-icon" aria-hidden="true" />
                                    EMBED ON SITE
                                </button>
                                <button
                                    className="btn-link share-embed-button"
                                    type="button"
                                    title="Embed this clock in a Notion page"
                                    onClick={() => setEmbedHelpOpen(true)}
                                >
                                    <SiNotion className="button-icon" aria-hidden="true" />
                                    EMBED IN NOTION
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {embedSiteOpen && (
                <EmbedSiteModal url={embedUrl} title={title} onClose={() => setEmbedSiteOpen(false)} />
            )}
            {embedHelpOpen && (
                <EmbedHelpModal url={embedUrl} onClose={() => setEmbedHelpOpen(false)} />
            )}
        </>,
        document.body
    );
}