"use client";

import { useState, useEffect } from "react";

export default function Typewriter({ words = ["product launch", "limited-time promotion", "unmissable event"], typeSpeed = 70, deleteSpeed = 40, pause = 1500 }) {
    const [wordIndex, setWordIndex] = useState(0);
    const [text, setText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const word = words[wordIndex % words.length];
        let timeout;

        if (!deleting && text === word) {
            timeout = setTimeout(() => setDeleting(true), pause);
        } else if (deleting && text === "") {
            timeout = setTimeout(() => {
                setDeleting(false);
                setWordIndex((i) => i + 1);
            }, 100);
        } else {
            timeout = setTimeout(() => {
                setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
            }, deleting ? deleteSpeed : typeSpeed);
        }

        return () => clearTimeout(timeout);
    }, [text, deleting, wordIndex, words, typeSpeed, deleteSpeed, pause]);

    return (
        <span className="typewriter-text">
            {text}
            <span className="typewriter-cursor">|</span>
        </span>
    );
}
