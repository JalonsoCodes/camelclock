"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";

export default function Navbar() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        let mounted = true;

        supabase.auth.getUser().then(({ data }) => {
            if (mounted) setUser(data.user ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) setUser(session?.user ?? null);
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
                    alt="CamelClocks logo" 
                    width={40} 
                    height={40} 
                    priority 
                />
            </Link>

            <div className={`nav-links ${open ? "open" : ""}`}>
                {user ? (
                    <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
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
                        <Link href="/new" className="btn-link" onClick={() => setOpen(false)}>+ New</Link>
                        <button
                            className="sign-out-button"
                            type="button"
                            onClick={() => supabase.auth.signOut()}
                        >
                            Sign out
                        </button>
                    </>
                ) : (
                    <button className="btn-link" type="button" onClick={() => setAuthOpen(true)}>Sign In</button>
                )}

                <button
                    className="hamburger"
                    type="button"
                    aria-label="Toggle menu"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {authOpen && (
                <AuthModal onClose={() => setAuthOpen(false)} onSuccess={() => { setAuthOpen(false); router.push("/dashboard"); }} />
            )}
        </nav>
    );
}
