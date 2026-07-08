import Navbar from "@/components/Navbar";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import CamelClock from "@/components/CamelClock";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <div id="hero-text">
          <h2>Stop using boring timers for your product launch.</h2>
          <h1 id="hero-text-action">Create a CamelClock!</h1>
        </div>
        <CamelClockBuilder />
      </main>
    </>
  )
}