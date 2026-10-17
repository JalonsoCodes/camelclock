"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import OptionSlider from "./OptionSlider";
import useFocusTrap from "@/hooks/useFocusTrap";

const THEME_OPTIONS = [
    { value: "light", label: "LIGHT" },
    { value: "dark", label: "DARK" },
];

const CARD_OPTIONS = [
    { value: "card", label: "CARD" },
    { value: "transparent", label: "TRANSPARENT" },
];

export default function EmbedHelpModal({ url, onClose }) {
    const trapRef = useFocusTrap(true);
    const [theme, setTheme] = useState("dark");
    const [card, setCard] = useState("card");
    const [copied, setCopied] = useState(false);

    const embedSrc = `${url}?theme=${theme}${card === "transparent" ? "&card=transparent" : ""}`;

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(embedSrc);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return createPortal(
        <div className="auth-modal-overlay" onClick={onClose}>
            <div
                className="auth-card nbtc"
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="embed-help-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                    <X aria-hidden="true" />
                </button>
                <h2 className="auth-title" id="embed-help-title">EMBED IN NOTION</h2>

                <div className="embed-site-options">
                    <div className="embed-site-option-group">
                        <span className="embed-site-option-label">THEME</span>
                        <OptionSlider ariaLabel="Embed theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
                    </div>
                    <div className="embed-site-option-group">
                        <span className="embed-site-option-label">CARD STYLE</span>
                        <OptionSlider ariaLabel="Embed card style" options={CARD_OPTIONS} value={card} onChange={setCard} />
                    </div>
                    <p className="embed-help-note">
                        CARD + DARK sits well on Notion&apos;s dark pages; TRANSPARENT + DARK fills the frame with
                        Notion&apos;s page colour.
                    </p>
                </div>

                <div className="share-field">
                    <span className="share-field-label">EMBED URL</span>
                    <div className="share-field-row nbtc">
                        <input readOnly value={embedSrc} onFocus={(e) => e.target.select()} />
                        <button className="share-copy-button" type="button" title="Copy to clipboard" onClick={copyUrl}>
                            {copied ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                <ol className="embed-help-steps">
                    <li>Pick your look above, then copy the embed URL.</li>
                    <li>In Notion, type <strong>/embed</strong> and press Enter.</li>
                    <li>Paste the URL into the embed block, then drag a corner to size it.</li>
                </ol>

                <p className="embed-help-note">
                    The embed is live — it keeps counting down in place, no refresh needed. The clock must stay Live
                    with EMBEDDING switched ON.
                </p>
            </div>
        </div>,
        document.body
    );
}
