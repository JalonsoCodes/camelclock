"use client";

import { useEffect, useRef, useState } from "react";
import EmbedClock from "./EmbedClock";
import { examples } from "@/content/landing";

/* How far off screen a card's clock may be before it starts ticking. Every
   CamelClock runs its own countdown interval and boost engine, so starting five
   of them at once costs five animation loops for art nobody is looking at. */
const START_MARGIN = "400px 0px";

function ExampleCard({ clock }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
            },
            { rootMargin: START_MARGIN }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    /* A fallback has no real clock row, so its title links nowhere. A real showcase
       is a live clock, so its links open the clock's own viewing page in a new tab. */
    const isFallback = clock.is_fallback === true;

    return (
        <article className="example-card nbtc" ref={ref}>
            <div className="example-card-clock">
                {visible ? (
                    <EmbedClock
                        clock={clock}
                        id={clock.id}
                        showWatermark={!isFallback}
                        titleHref={isFallback ? null : `/clock/${clock.id}`}
                        newTab={!isFallback}
                    />
                ) : (
                    /* Holds the space the canvas would take, so the grid does not
                       jump the moment each card starts. */
                    <div className="example-card-placeholder" aria-hidden="true" />
                )}
            </div>
        </article>
    );
}

export default function ExampleGrid({ clocks = [] }) {
    if (clocks.length === 0) return null;

    return (
        <section id="examples" className="examples-section">
            <h2 className="section-title">{examples.title}</h2>
            <p className="section-subtitle">{examples.subtitle}</p>

            <div className="example-grid">
                {clocks.map((clock) => (
                    <ExampleCard key={clock.id} clock={clock} />
                ))}
            </div>
        </section>
    );
}
