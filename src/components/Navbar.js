"use client";

import Image from "next/image";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="navbar nbtc">
            <div className="logo">
                <Image 
                    src="/logo.png" 
                    alt="CamelClocks logo" 
                    width={40} 
                    height={40} 
                    priority 
                />
            </div>

            <div className={`nav-links ${open ? "open" : ""}`}>
                <a href="#solutions" onClick={() => setOpen(false)}>Solutions</a>
                <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
            </div>

            <div className="navbar-content">
                <ThemeToggle />

                <button className="btn nbtc">Sign In</button>

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
        </nav>
    );
}
