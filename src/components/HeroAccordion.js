"use client";

/**
 * The hero's feature list, as an accordion.
 *
 * All five titles are visible at once and stay visible — the block is pinned
 * beside the camel, so the reader can see the whole ladder and scroll into
 * whichever part they want rather than being carried through it.
 *
 * Presentational on purpose. It knows the open index and reports clicks; the
 * camel state is LandingHero's business via useHeroBuild, and the scroll
 * geometry is useHeroSentinels'. Nothing here reads or writes layout, which is
 * why the two can change independently.
 *
 * `openIndex` is -1 for "nothing open", which is the state at the top of the
 * page before the first feature is reached.
 */
export default function HeroAccordion({ steps, openIndex, onOpen }) {
    return (
        <div className="hero-accordion">
            {steps.map((step, i) => {
                const isOpen = i === openIndex;
                const bodyId = `hero-feature-body-${i}`;

                return (
                    <div
                        className={`hero-accordion-item${isOpen ? " is-open" : ""}`}
                        key={step.title}
                    >
                        <button
                            type="button"
                            className="hero-accordion-row"
                            aria-expanded={isOpen}
                            aria-controls={bodyId}
                            onClick={() => onOpen(i)}
                        >
                            <span className="hero-accordion-count">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="hero-accordion-title">{step.title}</span>
                        </button>

                        {/* grid-template-rows 0fr -> 1fr in the stylesheet. It
                            animates to whatever height the copy actually needs,
                            which a measured height would not: these are pixel-font
                            paragraphs that reflow on resize and reflow again
                            when the webfont lands. */}
                        <div className="hero-accordion-body" id={bodyId} role="region" aria-label={step.title}>
                            <div className="hero-accordion-body-inner">
                                <p className="hero-feature-body">{step.body}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
