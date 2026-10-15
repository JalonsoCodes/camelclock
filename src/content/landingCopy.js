/* Site copy. Edit the strings here to change what the landing (and the create
   wizard it shares with /new) says — no component changes needed.

   Two rules when editing:
   - `hero.steps` and `quickStart.steps` are ordered. `id` / `key` are
     load-bearing (they choose the animation and the form field); the surrounding
     `title`, `body` and `question` text is safe to rewrite. Don't rename an
     `id` / `key` unless you also update the matching map in the component.
   - Prose is long-form. The pixel font needs plain, confident sentences — no
     hedging, no corporate filler. Keep feature copy under ~40 characters a line
     where you can. Apostrophes are fine written normally; use \u2014 for an em
     dash. */

export const hero = {
    /* Hero headline, rendered as coloured segments in order. `tone` picks a
       colour class: "green" (#4caf50) or "red" (#e53935). Leave `tone` off for
       the default ink. Keep the pieces in reading order so the sentence stays
       grammatical. */
    title: [
        { text: "Your " },
        { text: "extraordinary", tone: "green" },
        { text: " event deserves more than an " },
        { text: "extra ordinary", tone: "red" },
        { text: " countdown." },
    ],

    lede: "CamelClock transforms any date into a playful interactive mascot. Simple, shareable, and undeniably NOT boring.",

    ctaPrimary: { label: "Create your CamelClock", href: "#create" },
    ctaSecondary: { label: "But why?", href: "#occasion" },

    /* The build order is fixed by the animation constraints in LandingHero, so
       keep this list in the same order: the copy that talks about a thing must
       sit on the step that actually builds that thing. */
    steps: [
        {
            id: "occasion",
            title: "FOR ANY OCCASION",
            body: "From a birthday countdown, to a wedding invite, to a charity fundraiser - name an event and bring it alive.",
        },
        {
            id: "yours",
            title: "100% YOURS",
            body: "Your colours. Your wearables. Your vibe. An ugly CamelClock is not only hard to design, but also hardly our fault.",
        },
        {
            id: "alive",
            title: "FULLY INTERACTIVE",
            body: "Spam click your camel to hydrate it and unlock fresh effects like exercises and weather animations.",
        },
        {
            id: "play",
            title: "SHAREABLE ANYWHERE",
            body: "Drop the link in the group chat, in your bio, or embed the widget on your site for everyone to check out.",
        },
        {
            id: "anywhere",
            title: "WORTH THE WAIT",
            body: "Celebrate the big moment with a finishing animation and custom message.",
        },
    ],
};

/* Drives the create wizard, which is shared by the landing and /new. `key` must
   match the field rendered in ClockCreationWizard (event / when / style /
   completion) — `completion` is the last slide, where the CREATE button lives. */
export const quickStart = {
    title: "Create your first CamelClock",
    subtitle: "No pressure.",

    steps: [
        { key: "event", question: "What should we call your event?" },
        { key: "when", question: "When's it happening?" },
        { key: "style", question: "Why not give it some style?" },
        { key: "completion", question: "Any last changes?" },
    ],

    /* Every field the blank wizard clock starts from. Edit these to change what a
       visitor sees prefilled — `month` is 0-indexed (11 = December), `time` is
       24hr "HH:MM". */
    defaults: {
        title: "My Birthday",
        month: 8,
        day: 26,
        time: "00:00",
        introText: "in",
        celebrationMessage: "THE TIME HAS COME!",
        primaryColour: "#DBB279",
        secondaryColour: "#8E652C",
        wearables: [],
    },
};

export const examples = {
    title: "More clocks, already counting",
    subtitle: "Explore live countdowns made by the community, ready to share or embed anywhere.",
};
