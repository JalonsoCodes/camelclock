import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function DashboardHeader() {
    return (
        <header className="dashboard-header nbtc">
            <div className="dashboard-header-left">
                <Link href="/">
                    <Image src="/logo.png" alt="CamelClocks logo" width={40} height={40} priority />
                </Link>
                <span className="dashboard-title">MY CLOCKS</span>
            </div>

            <div className="dashboard-header-right">
                <ThemeToggle />
                <Link href="/" className="sign-out-button">SIGN OUT</Link>
            </div>
        </header>
    );
}
