/* FAQ, legal pages, and metadata. */

export const faq = {
    title: "FAQ",
    metaTitle: "FAQ",
    metaDescription: "Frequently asked questions about CamelClock, countdowns, timezones, embedding and more.",
    heading: "Frequently Asked Questions",
    contact: (email) => `Need something else? Contact us at ${email}`,
    contactEmail: "hello@camelclock.com",
    back: "Back to CamelClock",
    items: [
        {
            q: "How do times and timezones work with CamelClock?",
            a: [
                "When you create a clock you pick a month, day and time in your own local timezone. CamelClock stores that as a single, precise instant, so the clock ends at the exact same real-world moment everywhere.",
                "Each viewer's countdown (and the editable time in the builder) is shown in their own local timezone. A clock set for \u201C9 AM\u201D in New York will finish at the same real-world moment for a visitor in London — their wall-clock just shows a different hour for that instant.",
            ],
        },
        {
            q: "How do I embed my CamelClock on my website?",
            a: [
                "Open your live clock and press SHARE, then choose EMBED ON SITE — pick the theme, card style and size there, then copy the embed code into your site's HTML. The clock is responsive and will fit its container. TRANSPARENT lets your own page show through behind the clock.",
            ],
        },
        {
            q: "Can I embed a CamelClock in Notion?",
            a: [
                "Yes. Open your live clock and press the Notion icon next to the clock (or open SHARE and choose \u201CEMBED IN NOTION\u201D), pick your look, then copy the embed URL.",
                "In Notion, type /embed and press Enter, paste the URL, then drag a corner of the block to size it. The frame picks up Notion's own page colour, so it sits flush on light and dark pages. The countdown is live inside Notion while the clock stays published.",
            ],
        },
        {
            q: "What's the difference between a draft and a live clock? Are there limits?",
            a: [
                "A draft is private — only you can see it while you design. Publishing makes it live, publicly visible and shareable.",
                "The free plan allows up to 3 live clocks at once (drafts are unlimited). Going live past the limit opens the Pro waitlist, which removes the cap.",
            ],
        },
        {
            q: "Can I hydrate clocks?",
            a: [
                "Yes. Any live clock shows a + button. Clicking it gives your camel a well-needed drink.",
            ],
        },
        {
            q: "How do I change a clock's design or colours after saving?",
            a: [
                "Open the clock and press EDIT (you'll need to be signed in as the owner). The builder opens with all your saved settings, and changes save back to the same clock without affecting its publish status.",
            ],
        },
        {
            q: "How do I delete a clock or my account?",
            a: [
                "Open a clock from your dashboard and use the delete option on its card to remove it. To delete your whole account, go to Settings and choose \u201CDelete account\u201D — this permanently removes your clocks, hydrations and profile.",
            ],
        },
        {
            q: "Is CamelClock free?",
            a: [
                "CamelClock is free for personal use, including building unlimited drafts, keeping up to 3 live clocks, and interactive visitor hydrations. Pro — with unlimited live clocks, the full wearables closet and more — is coming soon; join the waitlist to get early access.",
            ],
        },
    ],
};

export const legal = {
    privacy: {
        title: "Privacy Policy",
        metaDescription: "Privacy Policy for CamelClock",
        updated: "Last updated: October 2026",
        back: "Back to CamelClock",
        sections: [
            {
                title: "1. What We Collect",
                body: [
                    "When you create an account, we collect your email address and a securely hashed password. We also store the countdown clocks you create, including their titles, target dates, customisation settings, and wearables. If you set a public handle, it is shown alongside your published clocks.",
                ],
            },
            {
                title: "2. Public Clocks",
                body: [
                    "Published clocks are public. Anyone with the share link can view a live clock, and a clock you embed can be seen by anyone who visits that page. Drafts are private to you. Do not put anything in a clock title or message that you would not want a stranger to read. Reports you submit are stored with your account and the clock you reported, and are visible only to site administrators.",
                ],
            },
            {
                title: "3. How We Use Your Data",
                body: [
                    "We use your data to provide the CamelClock service: storing your clocks, authenticating your account, and displaying your countdowns. We do not sell your personal data, and we do not use it for advertising or profiling.",
                ],
            },
            {
                title: "4. Analytics",
                body: [
                    "We use a privacy-focused, cookieless analytics tool (Umami Cloud) to understand how the site is used so we can improve it. It does not use cookies and does not store anything on your device. Sessions are counted from a rotating, hashed signature rather than a persistent identifier, your IP address is not retained, and we never send it your email, handle, or the contents of your clocks — only anonymous events such as \u201Ca clock was created\u201D or \u201Can embed code was copied\u201D. We limit its use to statistics and service improvement. If you send a Do Not Track signal from your browser, we do not track you at all.",
                ],
            },
            {
                title: "5. Cookies",
                body: [
                    "We use session cookies managed by Supabase to keep you signed in. These cookies are essential for the service to function and are not used for tracking or advertising. Our analytics tool sets no cookies.",
                ],
            },
            {
                title: "6. Third-Party Services",
                body: [
                    "We share data with the following providers, who process it on our behalf under data processing agreements:",
                ],
                list: [
                    "Supabase — authentication and database hosting.",
                    "Netlify — website hosting and content delivery.",
                    "Umami Cloud — cookieless analytics.",
                    "Plunk — transactional email (account confirmation, password resets).",
                ],
            },
            {
                title: "7. Legal Basis and International Transfers",
                body: [
                    "We process your data to perform our contract with you (running your account and clocks), on the basis of our legitimate interests (keeping the service secure and improving it), and — for analytics — under the \u201Cstatistical purposes\u201D exception in UK data protection law. Some of our providers store data outside the UK; where they do, transfers are protected by the UK International Data Transfer Addendum or the EU Standard Contractual Clauses.",
                ],
            },
            {
                title: "8. Data Retention",
                body: [
                    "Your account and clock data are retained as long as your account is active. You can delete your clocks at any time from the dashboard. You can delete your entire account (including all clocks and hydrations) at any time from Settings.",
                ],
            },
            {
                title: "9. Your Rights",
                body: [
                    "You can access, update, or delete your data at any time through your dashboard. You also have the right to object to our analytics. For any additional requests, contact us at the email below.",
                ],
            },
            {
                title: "10. Contact",
                body: [(email) => `For questions about this policy, contact us at: ${email}`],
                email: "hello@camelclock.com",
            },
        ],
    },
    terms: {
        title: "Terms of Service",
        metaDescription: "Terms of Service for CamelClock",
        back: "Back to CamelClock",
        sections: [
            { title: "1. Acceptance of Terms", body: ["By accessing or using CamelClock, you agree to be bound by these Terms of Service. If you do not agree, do not use the service."] },
            { title: "2. Age Requirement", body: ["You must be at least 13 years old to use CamelClock."] },
            { title: "2. Account Responsibility", body: ["You are responsible for maintaining the security of your account and for all activities that occur under it."] },
            { title: "3. Your Content", body: ["You retain ownership of the content you create (clocks, titles, messages). By publishing a clock, you grant us permission to display it publicly as part of the service."] },
            { title: "4. Acceptable Use", body: ["Do not use CamelClock for unlawful purposes, spam, or content that is hateful, abusive, or infringing. We reserve the right to remove content that violates these terms. To report a clock, use the REPORT THIS CLOCK link on its page or email hello@camelclock.com."] },
            { title: "5. Service Availability", body: ["The service is provided as-is. We may modify or discontinue features at any time without notice."] },
            { title: "6. Limitation of Liability", body: ["CamelClock is provided without warranties of any kind. To the fullest extent permitted by law, we are not liable for any damages arising from your use of the service."] },
            { title: "7. Termination", body: ["We may suspend or terminate your account if you violate these terms. You may delete your account at any time from Settings."] },
            { title: "8. Changes to These Terms", body: ["We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms."] },
            { title: "9. Governing Law", body: ["These terms are governed by the laws of England and Wales."] },
            { title: "10. Contact", body: ["For questions about these terms, contact us at hello@camelclock.com."] },
        ],
    },
};

export const seo = {
    rootTitleDefault: "CamelClock — Embeddable Pixel Camel Countdown Timer",
    rootTitleTemplate: "%s | CamelClock",
    rootDescription:
        "An interactive, stylish way to count down any big day: a pixel camel clock you customise, then share or embed on your site or Notion page — and let your crowd tap along.",
    rootOgTitle: "CamelClock — Embeddable Pixel Camel Countdown Timer",
    rootOgDescription:
        "An interactive, stylish pixel camel countdown you can customise, share and embed — and let your crowd tap along.",
    homeTitle: "Create a Free Embeddable Countdown Clock",
    homeDescription:
        "Create a custom pixel camel countdown clock. Share it with friends, embed on your website or Notion, and let people hydrate it together.",
    loginTitle: "Sign In | CamelClock",
    signupTitle: "Create Account | CamelClock",
    forgotTitle: "Reset Password | CamelClock",
    resetTitle: "Reset Password | CamelClock",
    settingsTitle: "Settings | CamelClock",
    newTitle: "New Clock | CamelClock",
    dashboardTitle: "Dashboard | CamelClock",
};

export const errors = {
    notFoundTitle: "Page not found",
    notFoundBody: "This page doesn't exist.",
    backHome: "Back to home",
    somethingWrong: "SOMETHING WENT WRONG",
    unexpected: "An unexpected error occurred.",
    dashboardError: "We couldn't load your dashboard.",
    tryAgain: "Try again",
};

export const admin = {
    showcases: {
        title: "Showcase Order",
        hint: "Drag order with the arrows below. A clock appears on the landing page when it's live and has",
        hintCode: "is_showcase = true",
        hintSuffix: "on its row in the database, then set its order here.",
        order: "ORDER",
        clock: "CLOCK",
        target: "TARGET",
        hydrations: "HYDRATIONS",
        moveUp: "Move up",
        moveDown: "Move down",
        empty: "No clocks are flagged as showcases. Set",
        emptyCode: "is_showcase = true",
        emptySuffix: "on a live clock to feature it here.",
    },
    boostTest: {
        wearables: "WEARABLES",
        wearablesSub: "One per slot. Wearables are drawn under every effect.",
        clear: "CLEAR",
        camelTitle: "BOOST TEST",
        camelIntro: "One run per click.",
        camelCelebrate: "TARGET!",
        effects: "BOOST EFFECTS",
        effectsSub: "One per category. Click to fit it and watch a single run.",
        hydrate: "HYDRATE +1",
        levelUp: "LEVEL UP",
        reset: "RESET",
        shuffleOrder: "SHUFFLE ORDER",
        theme: "THEME",
        currentOrder: "CURRENT BOOST ORDER",
        unlockedAt: (level) => `UNLOCKED AT LEVEL ${level}`,
    },
};
