import Navbar from "@/components/Navbar";
import CamelClockBuilder from "@/components/CamelClockBuilder";
import CamelClock from "@/components/CamelClock";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <h2>Stop using boring timers for your product launch.</h2>
        <h1>Create a CamelClock!</h1>
        <CamelClockBuilder />
      </main>
    </>
  )
}