"use client";

import { useEffect, useRef, useState } from "react";
import CamelClock from "./CamelClock";
import HeroAccordion from "./HeroAccordion";
import useShowcaseSteps from "@/hooks/useShowcaseSteps";
import useShowcaseHydrate from "@/hooks/useShowcaseHydrate";
import useHeroBuild from "@/hooks/useHeroBuild";
import useHeroSentinels from "@/hooks/useHeroSentinels";
import { hero as heroCopy } from "@/content/landing";
import "./landing-hero.css";

/* The build-up, in the order it can actually happen. Two constraints are baked in
   rather than left to be discovered:

   - Colours have to land before wearables, because the wearable step is a reveal
     progress of its own and CamelClock draws one or the other, not both.
   - Boosts have to land after that, because CamelClock's reveal path early-returns
     before drawCamelBoost, so anything moving underneath a filling pixel layer
     would simply be dropped. */

/* Gap between the hand-picked demo effects below, long enough that each lands
   before the next starts. */
const DEMO_GAP = 900;

/* Below this width the scroll production is dropped for a plain page. Matches
   the breakpoint where the two-column hero stops fitting. */
const SIMPLE_QUERY = "(max-width: 1200px)";

/* Prose lives in src/content/landing.js. What stays here is the behaviour a
   step carries — which effects it demos, whether it fires the finale — joined to
   that copy by the step's `id`. That is what lets the copy be reordered or
   rewritten in one place without ever detaching an animation from the words
   that sell it.

   `boosts` is one per category, which is all a clock can run: the push-up is the
   exercise, shine the aura, the sun the weather. It has to stay within one-per-
   category, which validateBoosts checks on a saved row but nothing checks here.

   `demo` is a demo, not equipment. A visitor who has waited a whole panel to
   maybe catch one animation is being shown the feature badly, so arriving fires
   a fixed, hand-picked run immediately — one at a time, in order. Edit the array
   to change the routine. */
const STEP_BEHAVIOUR = {
    alive: {
        boosts: ["pushup", "shine", "sun"],
        demo: ["pushup", "sparkle", "shine", "fireworks", "sun", "rain"],
    },
    anywhere: { celebrate: true },
};

const HERO_STEPS = heroCopy.steps.map((step) => ({ ...step, ...STEP_BEHAVIOUR[step.id] }));

/* The hero is a bespoke code-managed camel, not a real CamelClock row. It is not
   a clock anyone owns or hydrates, so its identity lives here rather than in the
   database. The date is expressed as month/day/time and rolls to its next
   occurrence, so the countdown never sits at zero. */
const HERO_CLOCK = {
    title: "World Camel Day",
    month: 5,
    day: 22,
    time: "00:00",
    introText: "in",
    celebrationMessage: "THE TIME HAS COME!",
    celebrationType: "spit",
    primaryColour: "#DBB279",
    secondaryColour: "#8E652C",
    wearables: ["top_hat", "gold_chain", "rollerskates"],
};

export default function LandingHero() {
    /* Simple mode is a different structure, not just a stylesheet swap: no
       pinned stage, no sentinels, no observer, and the features become ordinary
       sections. Rendering one camel either way makes the choice JS-driven; the
       media query is the only thing that knows which layout is on screen, and
       the initial false matches the server render (desktop) before it syncs. */
    const [simple, setSimple] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(SIMPLE_QUERY);
        const sync = () => setSimple(query.matches);
        sync();
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    /* The steps ride invisible sentinels rather than the accordion rows, which
       are pinned and so cannot be measured against the scroll. See the hook. */
    const { trackRef, count, scrollToStep } = useHeroSentinels(HERO_STEPS.length);
    const { index, goTo } = useShowcaseSteps(count, trackRef, scrollToStep);

    /* Nothing scrolls the build in simple mode, so every layer is handed over at
       once: the camel arrives dressed, with its demo boosts equipped, and the
       effects then run on their own cadence. */
    const buildIndex = simple ? HERO_STEPS.length : index;

    const {
        colourProgress,
        wearableRevealProgress,
        boostsLive,
        interactive,
        celebrate,
        wearables,
        boosts,
    } = useHeroBuild(HERO_STEPS, buildIndex, { wearables: HERO_CLOCK.wearables });

    const { camelRef, hydrateCount, level, hydrate } = useShowcaseHydrate();

    useEffect(() => {
        document.body.classList.add("show-navbar");
        return () => document.body.classList.remove("show-navbar");
    }, []);

    useEffect(() => {
        const id = window.location.hash.replace("#", "");
        if (!id) return;
        const raf = requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ block: "start" });
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    /* Fire the boosts slide's run the moment it is reached, because the point of
       the slide is to be seen happening rather than to describe something that
       might. Timers are tracked and cleared on the way out so a visitor who
       scrolls back up mid-run isn't left with a boost landing in an empty
       stage, and the ref re-arms when the step is left so returning replays it.
       Simple mode has no slides to arrive at — the equipped boosts run on their
       normal cadence instead. */
    useEffect(() => {
        if (simple || !boostsLive) return;
        /* Flattened across every step that declares a demo, so a second slide can
           add its own routine later without touching the timing. Index is the
           position in the run, not the step number. */
        const run = HERO_STEPS.flatMap((step) => step.demo ?? []);
        const timers = run.map((id, n) =>
            setTimeout(() => camelRef.current?.triggerNow(id), n * DEMO_GAP),
        );
        return () => timers.forEach(clearTimeout);
    }, [boostsLive, simple, camelRef]);

    /* Once per arrival, while the finale is on screen. `celebrate` is true for
       every render the visitor sits on that step, and preview() is not
       idempotent, so a ref is what actually keeps it to one run — the effect
       re-arms it on the way out, which is what lets a visitor scroll back up
       and come down to watch the finale fire again. Simple mode's camel is
       always fully built, so `celebrate` is permanently on with no arrival to
       mark; the finale is a scroll reward and is skipped there. */
    const celebratedRef = useRef(false);
    useEffect(() => {
        if (simple || !celebrate) {
            celebratedRef.current = false;
            return;
        }
        if (celebratedRef.current) return;
        celebratedRef.current = true;
        camelRef.current?.preview();
    }, [celebrate, simple, camelRef]);

    /* Step indices are 1-based, so the intro reads as -1 here: nothing open yet
       at the top of the page, which is what the accordion shows before the
       first feature is reached. */
    const openIndex = index - 1;

    /* A hero CTA can point at a step by its copy `id` (e.g. "#occasion"). Those
       steps have no DOM id to jump to, so route the click through the same goTo
       the accordion titles use — it lands on exactly the resting place a clicked
       title would. Anything else (e.g. "#create", a real section) falls through
       to the browser's normal anchor scroll. In simple mode the features are
       real sections carrying those ids, so every CTA is a plain anchor and
       nothing needs intercepting. */
    const handleCtaClick = (e, href) => {
        if (simple) return;
        const id = href?.startsWith("#") ? href.slice(1) : null;
        const stepIndex = HERO_STEPS.findIndex((step) => step.id === id);
        if (stepIndex === -1) return;
        e.preventDefault();
        goTo(stepIndex);
    };

    /* The intro and the camel are built as nodes rather than written inline, so
       the two layouts can arrange them differently: the desktop grid keeps the
       copy column whole beside a sticky stage, while simple mode pulls the camel
       up directly under the headline and pushes the lede and CTAs below it. */
    const titleNode = (
        <h1 className="hero-title">
            {heroCopy.title.map((part) => (
                <span key={part.text} className={part.tone ? `hero-title-${part.tone}` : undefined}>
                    {part.text}
                </span>
            ))}
        </h1>
    );

    const ledeNode = <p className="hero-lede">{heroCopy.lede}</p>;

    const actionsNode = (
        <div className="hero-actions">
            <a className="btn-link hero-cta" href={heroCopy.ctaPrimary.href} onClick={(e) => handleCtaClick(e, heroCopy.ctaPrimary.href)}>{heroCopy.ctaPrimary.label}</a>
            <a className="btn-link btn-secondary" href={heroCopy.ctaSecondary.href} onClick={(e) => handleCtaClick(e, heroCopy.ctaSecondary.href)}>{heroCopy.ctaSecondary.label}</a>
        </div>
    );

    /* No step attribute: the observer ignores the stage, so the camel keeps its
       page-load colours here and the build starts at step 1. */
    const stageNode = (
        <div className="hero-stage">
            <div className="hero-showcase-layer">
                <CamelClock
                    title={HERO_CLOCK.title}
                    month={HERO_CLOCK.month}
                    day={HERO_CLOCK.day}
                    time={HERO_CLOCK.time}
                    introText={HERO_CLOCK.introText}
                    celebrationMessage={HERO_CLOCK.celebrationMessage}
                    celebrationType={HERO_CLOCK.celebrationType}
                    primaryColour={HERO_CLOCK.primaryColour}
                    secondaryColour={HERO_CLOCK.secondaryColour}
                    wearables={wearables}
                    ref={camelRef}
                    revealProgress={colourProgress}
                    wearableRevealProgress={wearableRevealProgress}
                    boosts={boosts}
                    hydrateCount={hydrateCount}
                    level={level}
                    showWatermark={interactive}
                    hideWatermarkLink
                    hideLevelBanner
                    viewerHydrates
                    onHydrateClick={hydrate}
                />
            </div>
        </div>
    );

    return (
        /* The ref lands on the section itself, not on a wrapper, because the
           scroll track is the intro plus the sentinels and nothing else. Both
           consumers query this subtree for their own attributes. In simple mode
           there are no sentinels to find, so both simply no-op. */
        <section className={`landing-hero${simple ? " landing-hero--simple" : ""}`} ref={trackRef}>
            {simple ? (
                <>
                    {/* Headline, then the camel — a visitor should see what they
                        can build straight away. The lede and CTAs follow it so
                        the demo stays at the top of the page. */}
                    <div className="hero-intro">{titleNode}</div>

                    {stageNode}

                    <div className="hero-intro-tail">
                        {ledeNode}
                        {actionsNode}
                    </div>

                    {/* Same order and same copy as the accordion, but as ordinary
                        sections. Each carries its step `id` as the DOM id, which
                        is what turns a "#occasion" CTA into an anchor jump. */}
                    <div className="hero-features">
                        {HERO_STEPS.map((step, i) => (
                            <section className="hero-feature" id={step.id} key={step.id}>
                                <span className="hero-feature-count">{String(i + 1).padStart(2, "0")}</span>
                                <h2 className="hero-feature-title">{step.title}</h2>
                                <p className="hero-feature-body">{step.body}</p>
                            </section>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="hero-intro">
                        {titleNode}
                        {ledeNode}
                        {actionsNode}
                    </div>

                    {stageNode}

                    <div className="hero-copy-track">
                        {/* Pinned to the same box as the stage and centred the same way,
                            so the accordion stays level with the camel at any window
                            height without either needing to know about the other. */}
                        <div className="hero-copy-pane">
                            <HeroAccordion
                                steps={HERO_STEPS}
                                openIndex={openIndex}
                                onOpen={goTo}
                            />
                        </div>

                        {/* Geometry only, no visual rules at all. One per step, in normal
                            flow, so useShowcaseSteps can watch the midline band and a
                            clicked title has something to scroll to. */}
                        {HERO_STEPS.map((step, i) => (
                            <div
                                className="hero-sentinel"
                                key={step.title}
                                data-showcase-step={i + 1}
                            />
                        ))}

                        {/* Unmeasured, and deliberately so. The pane is sticky within
                            the track, so it starts releasing as the track's bottom edge
                            approaches it — without this tail the last panel would be
                            part-way out from under the reader while still being read. */}
                        <div className="hero-sentinel-tail" />
                    </div>
                </>
            )}
        </section>
    );
}
