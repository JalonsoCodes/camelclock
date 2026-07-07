import Image from "next/image";

export default function Navbar() {
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

            <div className="navbar-content">
                <div className="nav-links">
                    <a href="#solutions">Solutions</a>
                    <a href="#pricing">Pricing</a>
                </div>

                <button className="btn nbtc">Sign In</button>
            </div>
        </nav>
    );
}