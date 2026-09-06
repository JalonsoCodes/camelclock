"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
    ChevronDown,
    LogIn,
    LogOut,
    Plus,
    Rocket,
    Settings as SettingsIcon,
    UserPlus,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./auth/AuthModal";
import WaitlistModal from "./WaitlistModal";
import { MAX_LIVE_CLOCKS } from "@/utils/liveLimit";
import { LIVE_COUNT_EVENT } from "@/utils/liveCountEvents";
import { supabase } from "@/lib/supabase/client";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState("signup");
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [liveCount, setLiveCount] = useState(null);
    const [proOpen, setProOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);
    const fetchLiveCountRef = useRef(null);

    useEffect(() => {
        if (!accountOpen) return;

        const handlePointerDown = (e) => {
            if (accountRef.current && !accountRef.current.contains(e.target)) {
                setAccountOpen(false);
            }
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setAccountOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKey);
        };
    }, [accountOpen]);

    const handleSignOut = async () => {
        setAccountOpen(false);
        await supabase.auth.signOut();
        if (pathname.startsWith("/clock/")) {
            router.refresh();
        } else {
            router.push("/");
        }
    };

    const handleSectionNav = useCallback((e, id) => {
        e.preventDefault();
        setOpen(false);
        if (pathname !== "/") {
            router.push(`/?section=${id}`);
            return;
        }
        const target = document.getElementById(id);
        if (!target) return;

        // The animated hero is 900vh tall and collapses to auto-height once the
        // scroll animation locks, which shifts every section below it. Native
        // hash navigation targets the pre-lock offset and overshoots, so we
        // force the lock first (jumping the hero to its end) and then scroll to
        // the section from the now-stable layout.
        const scrollToTarget = () => {
            const navEl = document.querySelector(".navbar");
            const offset = navEl ? navEl.getBoundingClientRect().height : 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        };

        const container = document.querySelector(".scroll-container");
        if (container && !container.classList.contains("locked")) {
            const rect = container.getBoundingClientRect();
            const endY = rect.top + window.scrollY + rect.height - window.innerHeight;
            window.scrollTo({ top: endY, behavior: "instant" });
            requestAnimationFrame(() => requestAnimationFrame(scrollToTarget));
        } else {
            scrollToTarget();
        }
    }, [pathname, router]);

    useEffect(() => {
        let mounted = true;

        if (!user) return;

        const fetchCount = async (retried = false) => {
            const { data: count, error } = await supabase.rpc("count_my_live_clocks");
            if (!mounted) return;
            if (error && !retried && /jwt.*future/i.test(error.message)) {
                await supabase.auth.getSession();
                return fetchCount(true);
            }
            if (error) {
                setLiveCount(null);
            } else {
                setLiveCount(count ?? 0);
            }
        };

        fetchLiveCountRef.current = fetchCount;
        fetchCount();

        return () => { mounted = false; };
    }, [user, pathname]);

    useEffect(() => {
        const handler = () => fetchLiveCountRef.current?.();
        window.addEventListener(LIVE_COUNT_EVENT, handler);
        return () => window.removeEventListener(LIVE_COUNT_EVENT, handler);
    }, []);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getUser().then(async ({ data }) => {
            if (!mounted) return;
            const u = data.user ?? null;
            setUser(u);
            if (u) {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", u.id)
                    .single();
                if (profileError) {
                    console.error("Failed to load profile:", profileError.message);
                }
                if (mounted) setIsAdmin(profile?.is_admin ?? false);
            } else {
                setIsAdmin(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            const u = session?.user ?? null;
            setUser(u);
            if (u) {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", u.id)
                    .single();
                if (profileError) {
                    console.error("Failed to load profile:", profileError.message);
                }
                if (mounted) setIsAdmin(profile?.is_admin ?? false);
            } else {
                setIsAdmin(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <nav className="navbar nbtc">
            <Link href={user ? "/dashboard" : "/"} className="logo">
                <Image 
                    src="/logo.png" 
                    alt="CamelClock logo" 
                    width={40} 
                    height={40} 
                    priority 
                />
            </Link>

            <div className={`nav-links ${open ? "open" : ""}`}>
                {user ? (
                    <>
                        <Link href="/dashboard" className={pathname === "/dashboard" ? "nav-active" : ""} onClick={() => setOpen(false)}>My CamelClocks</Link>
                        {isAdmin && <Link href="/admin/showcases" className={pathname === "/admin/showcases" ? "nav-active" : ""} onClick={() => setOpen(false)}>Showcases</Link>}
                        {liveCount !== null && (
                            <button
                                className="nav-live-pill mobile-only"
                                type="button"
title={`${liveCount} of ${MAX_LIVE_CLOCKS} live Camel Clocks \u2014 Pro lifts the cap`}
aria-label={`${liveCount} of ${MAX_LIVE_CLOCKS} live Camel Clocks. See what Pro unlocks.`}
                                onClick={() => { setProOpen(true); setOpen(false); }}
                            >
                                <Rocket className="button-icon" />
                                {liveCount}/{MAX_LIVE_CLOCKS}
                            </button>
                        )}
                        <Link href="/new" className="btn-link mobile-only" onClick={() => setOpen(false)}><Plus className="button-icon" />New Clock</Link>
                        <Link href="/settings" className="btn-link mobile-only" onClick={() => setOpen(false)}><SettingsIcon className="button-icon" />Settings</Link>
                        <button type="button" className="btn-link mobile-only" onClick={() => { handleSignOut(); setOpen(false); }}>
                            <LogOut className="button-icon" />
                            Sign out
                        </button>
                    </>
                ) : (
                    <>
                        <a href="#features" onClick={(e) => handleSectionNav(e, "features")}>Features</a>
                        <a href="#pricing" onClick={(e) => handleSectionNav(e, "pricing")}>Pricing</a>
                        <button className="btn-link btn-secondary mobile-only" type="button" onClick={() => { setAuthMode("login"); setAuthOpen(true); setOpen(false); }}>
                            <LogIn className="button-icon" />
                            Sign In
                        </button>
                        <button className="btn-link mobile-only" type="button" onClick={() => { setAuthMode("signup"); setAuthOpen(true); setOpen(false); }}>
                            <UserPlus className="button-icon" />
                            Create Account
                        </button>
                    </>
                )}
            </div>

            <div className="navbar-content">
                <ThemeToggle />

                {user && liveCount !== null && (
                    <button
                        className="nav-live-pill"
                        type="button"
                        title={`${liveCount} of ${MAX_LIVE_CLOCKS} live Camel Clocks \u2014 Pro lifts the cap`}
                        aria-label={`${liveCount} of ${MAX_LIVE_CLOCKS} live Camel Clocks. See what Pro unlocks.`}
                        onClick={() => setProOpen(true)}
                    >
                        <Rocket className="button-icon" />
                        {liveCount}/{MAX_LIVE_CLOCKS}
                    </button>
                )}

                {user ? (
                    <>
                        <Link href="/new" className="btn-link" title="Create a new countdown clock" onClick={() => setOpen(false)}><Plus className="button-icon" />New</Link>
                        <div className="account-menu" ref={accountRef}>
                            <button
                                className="account-trigger"
                                type="button"
                                title="Account options"
                                aria-haspopup="true"
                                aria-expanded={accountOpen}
                                onClick={() => setAccountOpen((o) => !o)}
                            >
                                Account
                                <ChevronDown className="button-icon account-chevron" aria-hidden={accountOpen ? "true" : undefined} />
                            </button>
                            {accountOpen && (
                                <div className="account-dropdown nbtc">
                                    <Link href="/settings" onClick={() => setAccountOpen(false)}>
                                        <SettingsIcon className="button-icon" />
                                        Settings
                                    </Link>
                                    <button type="button" onClick={handleSignOut}>
                                        <LogOut className="button-icon" />
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            className="btn-link btn-secondary"
                            type="button"
                            title="Log in to your account"
                            onClick={() => { setAuthMode("login"); setAuthOpen(true); }}
                        >
                            <LogIn className="button-icon" />
                            Sign In
                        </button>
                        <button
                            className="btn-link"
                            type="button"
                            title="Sign up for a free account"
                            onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}
                        >
                            <UserPlus className="button-icon" />
                            Create Account
                        </button>
                    </>
                )}

                <button
                    className="hamburger"
                    type="button"
                    aria-label="Toggle menu"
                    title="Toggle menu"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {authOpen && (
                <AuthModal mode={authMode} onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); router.push("/dashboard"); }} />
            )}

            {proOpen && (
                <WaitlistModal onClose={() => setProOpen(false)} />
            )}
        </nav>
    );
}
