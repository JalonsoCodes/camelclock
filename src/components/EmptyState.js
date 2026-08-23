import Link from "next/link";
import { AlarmClockPlus } from "lucide-react";

export default function EmptyState() {
    return (
        <div className="empty-state nbtc">
            <h2>NO CLOCKS YET</h2>
            <p>Build your first CamelClock and it will show up here.</p>
            <Link href="/new" className="btn-link"><AlarmClockPlus className="button-icon" />CREATE YOUR FIRST CLOCK</Link>
        </div>
    );
}
