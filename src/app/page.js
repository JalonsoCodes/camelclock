import Navbar from "@/components/Navbar";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import CamelClock from "@/components/CamelClock";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <div id="hero-text">
          <h2>Stop using a boring timer for your product launch.</h2>
          <h1 id="hero-text-action">Create a CamelClock!</h1>
          <h2>The integrated and stylish Countdown + Waitlist</h2>
        </div>
        <CamelClockBuilder />
      </main>
    </>
  )
}