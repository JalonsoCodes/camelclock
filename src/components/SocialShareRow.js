"use client";

import { useEffect, useState } from "react";
import { Check, Code, Link, Mail, MoreHorizontal } from "lucide-react";
import { SiFacebook, SiNotion, SiTelegram, SiWhatsapp, SiX } from "react-icons/si";

function formatTimeLeft(ms) {
    if (ms <= 0) return null;
    const totalHours = Math.floor(ms / 3600000);
    if (totalHours < 1) {
        const mins = Math.max(1, Math.floor(ms / 60000));
        return mins === 1 ? "1 minute" : `${mins} minutes`;
    }
    if (totalHours < 48) {
        return totalHours === 1 ? "1 hour" : `${totalHours} hours`;
    }
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days < 14) {
        const tail = hours > 0 ? ` ${hours} ${hours === 1 ? "hour" : "hours"}` : "";
        return `${days} ${days === 1 ? "day" : "days"}${tail}`;
    }
    return days === 1 ? "1 day" : `${days} days`;
}

export default function SocialShareRow({ url, title, targetDate = null, showLabel = true, onNotion = null, onMore = null, layout = "icons" }) {
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const encodedUrl = encodeURIComponent(url);

    useEffect(() => {
        if (!targetDate) return;
        const update = () => setTimeLeft(formatTimeLeft(new Date(targetDate).getTime() - Date.now()));
        update();
        const id = setInterval(update, 60000);
        return () => clearInterval(id);
    }, [targetDate]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const lead = timeLeft ? `Only ${timeLeft} until "${title}".` : `Hydrate the countdown to "${title}".`;
    const message = `${lead} Hydrate the CamelClock so you don't miss it! ${url}`;
    const text = encodeURIComponent(message);
    const cardMessage = encodeURIComponent(`${lead} Hydrate the CamelClock so you don't miss it! ${url}`);

    const targets = [
        {
            id: "whatsapp",
            label: "Share on WhatsApp",
            href: `https://wa.me/?text=${text}`,
            external: true,
            Icon: SiWhatsapp,
            colour: "#25D366",
        },
        {
            id: "facebook",
            label: "Share on Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            external: true,
            Icon: SiFacebook,
            colour: "#1877F2",
        },
        {
            id: "x",
            label: "Share on X",
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${cardMessage}`,
            external: true,
            Icon: SiX,
            colour: "#111111",
        },
        {
            id: "telegram",
            label: "Share on Telegram",
            href: `https://t.me/share/url?url=${encodedUrl}&text=${cardMessage}`,
            external: true,
            Icon: SiTelegram,
            colour: "#229ED9",
        },
        {
            id: "email",
            label: "Share via Email",
            href: `mailto:?subject=${encodeURIComponent(`Countdown to ${title}`)}&body=${encodeURIComponent(message)}`,
            external: false,
            Icon: Mail,
            colour: "#8E652C",
        },
    ];

    // The viewer's compact share block leads with a square brand row, then stacks the action
    // buttons full-width beneath it. The icons row here is the order that block uses, which
    // deliberately differs from the loose targets array above (that one keeps Telegram too).
    const targetsById = {};
    for (const target of targets) targetsById[target.id] = target;
    const stackedTopRow = ["whatsapp", "x", "facebook", "email"];

    const renderBrand = ({ label, href, external, Icon, colour }) => (
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
    );

    return (
        <div className="social-share-block">
            {showLabel && <span className="share-field-label">SHARE VIA</span>}
            {layout === "stacked" ? (
                <>
                    <div className="social-share-row">
                        {stackedTopRow.map((id) => (
                            renderBrand(targetsById[id])
                        ))}
                    </div>
                    <div className="social-share-actions">
                        <button
                            type="button"
                            className="social-share-action nbtc"
                            onClick={copyLink}
                            aria-label={copied ? "Link copied" : "Copy link"}
                            title={copied ? "Link copied" : "Copy link"}
                        >
                            {copied ? <Check aria-hidden="true" /> : <Link aria-hidden="true" />}
                            {copied ? "COPIED" : "COPY LINK"}
                        </button>
                        {onMore && (
                            <button
                                type="button"
                                className="social-share-action social-share-action-embed-site nbtc"
                                onClick={onMore}
                                title="Get the embed code"
                            >
                                <Code aria-hidden="true" />
                                EMBED ON SITE
                            </button>
                        )}
                        {onNotion && (
                            <button
                                type="button"
                                className="social-share-action nbtc"
                                onClick={onNotion}
                                title="Embed this clock in Notion"
                            >
                                <SiNotion aria-hidden="true" />
                                EMBED IN NOTION
                            </button>
                        )}
                    </div>
                </>
            ) : (
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
                    {targets.map((target) => renderBrand(target))}
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
            )}
        </div>
    );
}
