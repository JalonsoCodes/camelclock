"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function ShareDialog({ clockId, title, onClose }) {
    const [copied, setCopied] = useState(null);
    const trapRef = useFocusTrap(true);

    const shareUrl = `${window.location.origin}/clock/${clockId}`;
    const embedCode = `<iframe src="${shareUrl}/embed" width="100%" height="560" frameborder="0" style="border:0;" title="${title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}"></iframe>`;

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
        <div className="share-dialog-overlay" onClick={onClose}>
            <div className="share-dialog nbtc" ref={trapRef} onClick={(e) => e.stopPropagation()}>
                <h2 className="share-dialog-title">YOUR CLOCK IS READY</h2>
                <p className="share-dialog-subtitle">&ldquo;{title}&rdquo; has been saved. Share a link or embed it anywhere.</p>

                <div className="share-field">
                    <span className="share-field-label">SHARE LINK</span>
                    <div className="share-field-row nbtc">
                        <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                        <button
                            className="share-copy-button"
                            type="button"
                            onClick={() => copy("link", shareUrl)}
                        >
                            {copied === "link" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                <div className="share-field">
                    <span className="share-field-label">EMBED CODE</span>
                    <div className="share-field-row nbtc">
                        <input readOnly value={embedCode} onFocus={(e) => e.target.select()} />
                        <button
                            className="share-copy-button"
                            type="button"
                            onClick={() => copy("embed", embedCode)}
                        >
                            {copied === "embed" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                <div className="share-dialog-actions">
                    <Link href="/dashboard" className="btn-link">VIEW ALL CLOCKS</Link>
                    <button className="share-done-button nbtc" type="button" onClick={onClose}>
                        DONE
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
