"use client";

import { Mail } from "lucide-react";
import { SiFacebook, SiTelegram, SiWhatsapp, SiX } from "react-icons/si";

export default function SocialShareRow({ url, title }) {
    const encodedUrl = encodeURIComponent(url);
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
            <span className="share-field-label">SHARE VIA</span>
            <div className="social-share-row">
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
            </div>
        </div>
    );
}
