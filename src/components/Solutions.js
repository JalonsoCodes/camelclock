import CamelClock from "./CamelClock";

const clocks = [
    {
        title: "Product Launch",
        month: 10,
        day: 15,
        time: "09:00",
        introText: "Ends in:",
        primaryColour: "#DBB279",
        secondaryColour: "#8E652C",
    },
    {
        title: "Flash Sale",
        month: 8,
        day: 5,
        time: "23:59",
        introText: "Sale ends:",
        primaryColour: "#E23B3B",
        secondaryColour: "#7A1414",
    },
    {
        title: "Holiday Countdown",
        month: 11,
        day: 25,
        time: "00:00",
        introText: "Until Christmas:",
        primaryColour: "#E23B3B",
        secondaryColour: "#1E7A2F",
    },
    {
        title: "Game Release",
        month: 9,
        day: 30,
        time: "18:00",
        introText: "Release in:",
        primaryColour: "#B44DFF",
        secondaryColour: "#2ECC71",
    },
    {
        title: "App Ship Day",
        month: 8,
        day: 20,
        time: "12:00",
        introText: "Shipping in:",
        primaryColour: "#4D79FF",
        secondaryColour: "#0F2F8E",
    },
    {
        title: "Wedding Countdown",
        month: 10,
        day: 7,
        time: "14:00",
        introText: "The big day:",
        primaryColour: "#F48FB1",
        secondaryColour: "#AD1457",
    },
];

export default function Solutions() {
    return (
        <section id="solutions">
            <h2>One CamelClock, every occasion</h2>
            <div className="solutions-grid">
                {clocks.map((clock, index) => (
                    <div key={index} className="solutions-cell nbtc">
                        <CamelClock {...clock} />
                    </div>
                ))}
            </div>
        </section>
    );
}
