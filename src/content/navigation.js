/* Navbar, account menu, theme toggle, and the global footer. */

export const navigation = {
    brandAlt: "CamelClock logo",
    myClocks: "My CamelClocks",
    showcases: "Showcases",
    newClock: "New Clock",
    newShort: "New",
    settings: "Settings",
    signOut: "Sign out",
    signIn: "Sign In",
    createAccount: "Create Account",
    makeAClock: "Make a clock",
    pricing: "Pricing",
    account: "Account",
    toggleMenu: "Toggle menu",
    accountOptions: "Account options",
    logInTitle: "Log in to your account",
    signUpTitle: "Sign up for a free account",
    newClockTitle: "Create a new CamelClock",
    livePillTitle: (liveCount, max) =>
        `${liveCount} of ${max} live CamelClocks \u2014 Pro lifts the cap`,
    livePillAria: (liveCount, max) =>
        `${liveCount} of ${max} live CamelClocks. See what Pro unlocks.`,
    themeLightLabel: "Switch to light mode",
    themeDarkLabel: "Switch to dark mode",
    footer: {
        faq: "FAQ",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
    },
};
