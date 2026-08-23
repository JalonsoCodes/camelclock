"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogIn, LogOut, Plus, UserPlus } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState("signup");
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

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
                        <Link href="/dashboard" className={pathname === "/dashboard" ? "nav-active" : ""} onClick={() => setOpen(false)}>Dashboard</Link>
                        {isAdmin && <Link href="/admin/templates" className={pathname === "/admin/templates" ? "nav-active" : ""} onClick={() => setOpen(false)}>Templates</Link>}
                    </>
                ) : (
                    <>
                        <Link href="/#solutions" onClick={() => setOpen(false)}>Solutions</Link>
                        <Link href="/#pricing" onClick={() => setOpen(false)}>Pricing</Link>
                    </>
                )}
            </div>

            <div className="navbar-content">
                <ThemeToggle />

                {user ? (
                    <>
                        <Link href="/new" className="btn-link" title="Create a new countdown clock" onClick={() => setOpen(false)}><Plus className="button-icon" />New</Link>
                        <button
                            className="sign-out-button"
                            type="button"
                            title="Sign out of CamelClocks"
                            onClick={async () => {
                                await supabase.auth.signOut();
                                if (pathname.startsWith("/clock/")) {
                                    router.refresh();
                                } else {
                                    router.push("/");
                                }
                            }}
                        >
                            <LogOut className="button-icon" />
                            Sign out
                        </button>
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
        </nav>
    );
}
