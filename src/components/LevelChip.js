import { levelFromCount } from "@/utils/boost";

export default function LevelChip({ hydrateCount }) {
    const level = levelFromCount(hydrateCount);
    return (
        <span className="level-chip" title={`Level ${level}`}>
            LV {level}
        </span>
    );
}