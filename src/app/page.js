import Navbar from "@/components/Navbar";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import CamelClock from "@/components/CamelClock";
import Typewriter from "@/components/Typewriter";
import Solutions from "@/components/Solutions";
import Pricing from "@/components/Pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create a Countdown Clock",
  description:
    "Design and share embeddable countdown clocks with pixel-art camels. Free for personal use.",
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <div id="hero-text">
          <h2>
            Stop using a boring timer for your{" "}
            <Typewriter words={["product launch", "exclusive offer", "unmissable event", "SaaS release", "fundraiser", "merch drop"]} />
            .
          </h2>
          <h1 id="hero-text-action">Create a CamelClock!</h1>
          <h2>The integrated and stylish Countdown + Waitlist</h2>
        </div>
        <CamelClockBuilder />
        <Solutions />
        <Pricing />
      </main>
    </>
  )
}