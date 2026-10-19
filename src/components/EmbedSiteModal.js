"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import OptionSlider from "./OptionSlider";
import useFocusTrap from "@/hooks/useFocusTrap";
import { track } from "@/utils/analytics";

const THEME_OPTIONS = [
    { value: "light", label: "LIGHT" },
    { value: "dark", label: "DARK" },
];

const CARD_OPTIONS = [
    { value: "card", label: "CARD" },
    { value: "transparent", label: "TRANSPARENT" },
];

const SIZE_OPTIONS = [
    { value: "sm", label: "SMALL" },
    { value: "md", label: "MEDIUM" },
    { value: "lg", label: "LARGE" },
];

const MOCKUP_PARAS = [
    ["17rem", "13rem", "14rem", "16rem", "8rem"],
    ["15rem", "12rem", "16rem", "9rem"],
    ["16rem", "10rem", "14rem"],
    ["15rem", "13rem", "11rem", "16rem", "7rem"],
    ["17rem", "12rem", "15rem", "9rem"],
    ["14rem", "16rem", "12rem", "13rem"],
    ["16rem", "11rem", "15rem", "14rem", "8rem"],
    ["13rem", "17rem", "12rem", "16rem"],
    ["15rem", "14rem", "16rem", "10rem", "12rem"],
];

function escapeHtmlAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export default function EmbedSiteModal({ url, title, onClose }) {
    const trapRef = useFocusTrap(true);
    const iframeRef = useRef(null);
    const [theme, setTheme] = useState("light");
    const [card, setCard] = useState("card");
    const [size, setSize] = useState("md");
    const [copied, setCopied] = useState(null);

    const embedSrc = `${url}?theme=${theme}${card === "transparent" ? "&card=transparent" : ""}&size=${size}`;
    const embedCode = `<iframe src="${embedSrc}" width="100%" height="560" frameborder="0" style="border:0;background:transparent;" title="${escapeHtmlAttribute(title)}" loading="lazy"></iframe>`;

    const sizePreview = useCallback(() => {
        const frame = iframeRef.current;
        if (!frame) return;
        try {
            const doc = frame.contentDocument;
            const main = doc?.querySelector(".public-clock");
            const card = doc?.querySelector(".public-clock-card");
            if (!main || !card) return;
            const styles = doc.defaultView.getComputedStyle(main);
            const pad = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
            const height = Math.ceil(card.getBoundingClientRect().height + pad);
            if (height > 0) frame.style.height = `${height}px`;
        } catch {
            /* cross-origin or still booting — keep the CSS fallback height */
        }
    }, []);

    useEffect(() => {
        const frame = iframeRef.current;
        if (!frame || typeof ResizeObserver === "undefined") return;
        let raf = 0;
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(sizePreview);
        });
        observer.observe(frame);
        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, [sizePreview]);

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
            // North-star event: an embed actually handed to a website.
            track("embed_copied_site", { kind: type, size, theme, card });
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    return createPortal(
        <div className="auth-modal-overlay embed-site-overlay" onClick={onClose}>
            <div
                className="embed-site-card nbtc"
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="embed-site-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                    <X aria-hidden="true" />
                </button>

                <div className="embed-site-head">
                    <h2 className="auth-title" id="embed-site-title">EMBED ON YOUR SITE</h2>
                    <p className="embed-site-lede">
                        Tune the look and watch the preview — then copy the code. The preview is the real embedded clock.
                    </p>
                </div>

                <div className="embed-site-layout">
                    <div className="embed-site-controls">
                        <div className="embed-site-options">
                            <div className="embed-site-option-group">
                                <span className="embed-site-option-label">THEME</span>
                                <OptionSlider ariaLabel="Preview theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
                            </div>
                            <div className="embed-site-option-group">
                                <span className="embed-site-option-label">CARD STYLE</span>
                                <OptionSlider ariaLabel="Preview card style" options={CARD_OPTIONS} value={card} onChange={setCard} />
                            </div>
                            <div className="embed-site-option-group">
                                <span className="embed-site-option-label">SIZE</span>
                                <OptionSlider ariaLabel="Preview size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
                            </div>
                        </div>

                        <div className="share-field">
                            <span className="share-field-label">EMBED CODE</span>
                            <div className="share-field-row nbtc">
                                <input readOnly value={embedCode} onFocus={(e) => e.target.select()} />
                                <button className="share-copy-button" type="button" title="Copy to clipboard" onClick={() => copy("code", embedCode)}>
                                    {copied === "code" ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                                    {copied === "code" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <div className="share-field">
                            <span className="share-field-label">EMBED URL</span>
                            <div className="share-field-row nbtc">
                                <input readOnly value={embedSrc} onFocus={(e) => e.target.select()} />
                                <button className="share-copy-button" type="button" title="Copy to clipboard" onClick={() => copy("url", embedSrc)}>
                                    {copied === "url" ? <Check className="button-icon" /> : <Copy className="button-icon" />}
                                    {copied === "url" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <ol className="embed-help-steps">
                            <li>Copy the HTML code above.</li>
                            <li>Paste it into your site&apos;s code view — or an HTML block in your page builder — where the clock should appear.</li>
                            <li>Adjust the <strong>height</strong> (560px) to fit your layout — the clock fills the frame.</li>
                        </ol>

                        <p className="embed-help-note">
                            The embed is live — it keeps counting down in place, no refresh needed. The clock must stay Live
                            with EMBEDDING switched ON.
                        </p>
                    </div>

                    <div className="embed-site-preview">
                        <span className="embed-site-preview-label">LIVE PREVIEW</span>
                        <div className={`embed-mockup ${theme}`}>
                            <div className="embed-mockup-browser">
                                <div className="embed-mockup-chrome">
                                    <span className="embed-mockup-dots" aria-hidden="true">
                                        <i /><i /><i />
                                    </span>
                                    <div className="embed-mockup-url">https://your-blog.com/our-countdown</div>
                                </div>
                                <div className="embed-mockup-page">
                                    <div className="embed-mockup-nav" aria-hidden="true">
                                        <div className="embed-mockup-brand" />
                                        <div className="embed-mockup-links">
                                            <span /><span /><span />
                                        </div>
                                    </div>
                                    <div className="embed-mockup-article">
                                        <div className="embed-mockup-post-head" aria-hidden="true">
                                            <div className="embed-mockup-title" />
                                            <div className="embed-mockup-meta" />
                                        </div>
                                        <div className="embed-mockup-wrapped">
                                            <div className="embed-mockup-float">
                                                <iframe
                                                    ref={iframeRef}
                                                    className="embed-mockup-iframe"
                                                    src={embedSrc}
                                                    title={`${title} embed preview`}
                                                    loading="lazy"
                                                    onLoad={() => requestAnimationFrame(sizePreview)}
                                                />
                                            </div>
                                            {MOCKUP_PARAS.map((widths, i) => (
                                                <p className="embed-mockup-para" key={i} aria-hidden="true">
                                                    {widths.map((w, j) => (
                                                        <i key={j} style={{ width: w }} />
                                                    ))}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}