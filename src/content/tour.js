/* First-run tour copy. Edit the strings here to change what the guided tour
   says — no component changes needed.

   Three rules when editing:
   - `steps` is keyed by the rung id, and those ids are load-bearing (they pick
     the target element, the gating and the order). The `title` / `body` prose
     is safe to rewrite. Don't rename a key unless you also update the rung
     order in ClockTour.
   - The `vote` and `rack` rungs only exist once the clock has actually reached
     level 2 and a poll is open, so their copy can speak in the present tense.
   - Prose is beginner-facing and long-form. The pixel font needs plain,
     confident sentences — no hedging, no jargon. Explain terms (hydration,
     level, effect) rather than assuming them. Apostrophes are fine written
     normally; use \u2014 for an em dash. */

export const tour = {
    /* Shown at the top of the post-publish share dialog: the clock is live, the
       link is right there, and the tour starts from its buttons. */
    welcome: {
        title: "YOUR CAMELCLOCK IS LIVE",
        body: [
            "Welcome to your very own published CamelClock! Anyone who opens the link can join the fun by hydrating your camel and voting for new effects!",
            "Discover all the fresh features of your creation by taking the tutorial."
        ],
    },

    /* The rungs, in order. `hydrate`, `levelbar` and `vote` are gated on the reader's own
       action and carry no button - the tour moves on when the action lands. `rack`, `daily`
       and `share` are copy-only and keep a NEXT button. `vote` and `rack` only appear once a
       level-2 poll exists. */
    steps: {
        hydrate: {
            title: "GIVE YOUR CAMEL A DRINK",
            body: "Camels need water your CamelClock is no different. Try tapping the camel once to HYDRATE it.",
        },
        levelbar: {
            title: "WATCH IT LEVEL UP",
            body: "Every hydration your camel gets goes towards its hydration LEVEL. Fill the boxes to level up and unlock 2 brand-new effects.",
        },
        vote: {
            title: "VOTE FOR NEW EFFECTS",
            body: "Level 2 unlocked! Two random new BOOSTS just dropped, but you can only unlock one. Try previewing both animations and voting for your favourite.",
        },
        rack: {
            title: "YOUR BOOST RACK",
            body: "This is the home of all available BOOSTS. Once the current vote is over, you'll see the winner unlocked below.",
        },
        daily: {
            title: "YOUR DAILY HYDRATIONS",
            body: "You get a fresh set of 15 to 25 hydrations per day to be shared across all your CamelClocks. Spend them wisely.",
        },
        share: {
            title: "GET EVERYONE INVOLVED",
            body: "More SHARES = more HYDRATIONS = more BOOSTS = more FUN. By the time your event arrives, your CamelClock could be maxed out and bursting with cool effects.",
        },
    },

    /* Labels used by the tour UI. `startLabel` and `skipLabel` are shared by the
       welcome share dialog and the mini steps. */
    skipLabel: "SKIP TUTORIAL",
    startLabel: "START TUTORIAL",
    nextLabel: "NEXT",
    doneLabel: "DONE",
    hydrateHint: "TAP THE CAMEL TO CONTINUE",
    hydrateElsewhere: "TAP THE CAMEL ANY TIME TO HYDRATE.",
    /* The level step counts down as the reader drinks. `{count}` is the number of drinks
       still needed to reach `{level}`. */
    levelHint: "{count} MORE CLICKS TO UNLOCK LEVEL {level}",
    voteHint: "CAST YOUR VOTE TO CONTINUE - SHARE FOR MORE VOTES",
    ariaLabel: "Guided tour",
};
