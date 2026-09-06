"use client";

import { useState } from "react";
import { Check, Link, Mail, MoreHorizontal } from "lucide-react";
import { SiFacebook, SiNotion, SiTelegram, SiWhatsapp, SiX } from "react-icons/si";

export default function SocialShareRow({ url, title, showLabel = true, onNotion = null, onMore = null }) {
    const [copied, setCopied] = useState(false);
    const encodedUrl = encodeURIComponent(url);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };
    const text = encodeURIComponent(`${title} ${url}`);

    const targets = [
        {
            label: "Share on WhatsApp",
            href: `https://wa.me/?text=${text}`,
            external: true,
            Icon: SiWhatsapp,
            colour: "#25D366",
        },
        {
            label: "Share on Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            external: true,
            Icon: SiFacebook,
            colour: "#1877F2",
        },
        {
            label: "Share on X",
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
            external: true,
            Icon: SiX,
            colour: "#111111",
        },
        {
            label: "Share on Telegram",
            href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title)}`,
            external: true,
            Icon: SiTelegram,
            colour: "#229ED9",
        },
        {
            label: "Share via Email",
            href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedUrl}`,
            external: false,
            Icon: Mail,
            colour: "#8E652C",
        },
    ];

    return (
        <div className="social-share-block">
            {showLabel && <span className="share-field-label">SHARE VIA</span>}
            <div className="social-share-row">
                <button
                    type="button"
                    className="social-share-button nbtc social-share-button-outline"
                    onClick={copyLink}
                    aria-label={copied ? "Link copied" : "Copy link"}
                    title={copied ? "Link copied" : "Copy link"}
                >
                    {copied ? <Check aria-hidden="true" /> : <Link aria-hidden="true" />}
                </button>
                {targets.map(({ label, href, external, Icon, colour }) => (
                    <a
                        key={label}
                        className="social-share-button nbtc"
                        style={{ backgroundColor: colour }}
                        href={href}
                        aria-label={label}
                        title={label}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                        <Icon aria-hidden="true" />
                    </a>
                ))}
                {onNotion && (
                    <button
                        type="button"
                        className="social-share-button nbtc"
                        style={{ backgroundColor: "#191919" }}
                        onClick={onNotion}
                        aria-label="Embed this clock in Notion"
                        title="Embed this clock in Notion"
                    >
                        <SiNotion aria-hidden="true" />
                    </button>
                )}
                {onMore && (
                    <button
                        type="button"
                        className="social-share-button nbtc social-share-button-outline"
                        onClick={onMore}
                        aria-label="More share options"
                        title="More share options"
                    >
                        <MoreHorizontal aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
}
