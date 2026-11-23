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
    Settings as SettingsIcon,
    UserPlus,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";
import { navigation } from "@/content/navigation";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState("signup");
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);

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
            router.push(`/#${id}`);
            return;
        }
        document.getElementById(id)?.scrollIntoView({ block: "start" });
    }, [pathname, router]);

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
                    alt={navigation.brandAlt} 
                    width={40} 
                    height={40} 
                    priority 
                />
            </Link>

            <div className={`nav-links ${open ? "open" : ""}`}>
                {user ? (
                    <>
                        <Link href="/dashboard" className={pathname === "/dashboard" ? "nav-active" : ""} onClick={() => setOpen(false)}>{navigation.myClocks}</Link>
                        {isAdmin && <Link href="/admin/showcases" className={pathname === "/admin/showcases" ? "nav-active" : ""} onClick={() => setOpen(false)}>{navigation.showcases}</Link>}
                        <Link href="/new" className="btn-link mobile-only" onClick={() => setOpen(false)}><Plus className="button-icon" />{navigation.newClock}</Link>
                        <Link href="/settings" className="btn-link mobile-only" onClick={() => setOpen(false)}><SettingsIcon className="button-icon" />{navigation.settings}</Link>
                        <button type="button" className="btn-link mobile-only" onClick={() => { handleSignOut(); setOpen(false); }}>
                            <LogOut className="button-icon" />
                            {navigation.signOut}
                        </button>
                    </>
                ) : (
                    <>
                        <a href="#create" onClick={(e) => handleSectionNav(e, "create")}>{navigation.makeAClock}</a>
                        <button className="btn-link btn-secondary mobile-only" type="button" onClick={() => { setAuthMode("login"); setAuthOpen(true); setOpen(false); }}>
                            <LogIn className="button-icon" />
                            {navigation.signIn}
                        </button>
                        <button className="btn-link mobile-only" type="button" onClick={() => { setAuthMode("signup"); setAuthOpen(true); setOpen(false); }}>
                            <UserPlus className="button-icon" />
                            {navigation.createAccount}
                        </button>
                    </>
                )}
            </div>

            <div className="navbar-content">
                <ThemeToggle />

                {user ? (
                    <>
                        <Link href="/new" className="btn-link" title={navigation.newClockTitle} onClick={() => setOpen(false)}><Plus className="button-icon" />{navigation.newShort}</Link>
                        <div className="account-menu" ref={accountRef}>
                            <button
                                className="account-trigger"
                                type="button"
                                title={navigation.accountOptions}
                                aria-haspopup="true"
                                aria-expanded={accountOpen}
                                onClick={() => setAccountOpen((o) => !o)}
                            >
                                {navigation.account}
                                <ChevronDown className="button-icon account-chevron" aria-hidden={accountOpen ? "true" : undefined} />
                            </button>
                            {accountOpen && (
                                <div className="account-dropdown nbtc">
                                    <Link href="/settings" onClick={() => setAccountOpen(false)}>
                                        <SettingsIcon className="button-icon" />
                                        {navigation.settings}
                                    </Link>
                                    <button type="button" onClick={handleSignOut}>
                                        <LogOut className="button-icon" />
                                        {navigation.signOut}
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
                            title={navigation.logInTitle}
                            onClick={() => { setAuthMode("login"); setAuthOpen(true); }}
                        >
                            <LogIn className="button-icon" />
                            {navigation.signIn}
                        </button>
                        <button
                            className="btn-link"
                            type="button"
                            title={navigation.signUpTitle}
                            onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}
                        >
                            <UserPlus className="button-icon" />
                            {navigation.createAccount}
                        </button>
                    </>
                )}

                <button
                    className="hamburger"
                    type="button"
                    aria-label={navigation.toggleMenu}
                    title={navigation.toggleMenu}
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
        </nav>
    );
}
