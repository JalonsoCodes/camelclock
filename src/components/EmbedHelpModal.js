"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function EmbedHelpModal({ url, onClose }) {
    const trapRef = useFocusTrap(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
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

                <div className="share-field">
                    <span className="share-field-label">EMBED URL</span>
                    <div className="share-field-row nbtc">
                        <input readOnly value={url} onFocus={(e) => e.target.select()} />
                        <button className="share-copy-button" type="button" title="Copy to clipboard" onClick={copyUrl}>
                            {copied ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                <ol className="embed-help-steps">
                    <li>Copy the embed URL above.</li>
                    <li>In Notion, type <strong>/embed</strong> and press Enter.</li>
                    <li>Paste the URL into the embed block, then drag a corner to size it.</li>
                    <li>
                        To change the look, append <strong>?theme=dark</strong> or <strong>?card=transparent</strong>
                        to the URL. CARD + DARK sits well on Notion&apos;s dark pages.
                    </li>
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