"use client";

import { BOOSTS } from "@/utils/grids";
import { POLL_QUORUM } from "@/utils/polls";

const RESOLVED_FLASH_MS = 12000;

function formatCountdown(closesAt, now) {
    const ms = new Date(closesAt).getTime() - now;
    if (ms <= 0) return "CLOSED";
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}H ${String(m).padStart(2, "0")}M ${String(s).padStart(2, "0")}S`;
}

function PollOption({ poll, def, choice, count, total, signedIn, voted, closed, onVote, onPreview, onPreviewEnd, onSignIn }) {
    if (!def) return null;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const isMine = voted === choice;

    const handleClick = () => {
        onPreview(def.id);
        if (closed) return;
        if (!signedIn) {
            onSignIn?.();
            return;
        }
        if (voted === choice) return;
        onVote(poll.id, choice);
    };

    return (
        <button
            type="button"
            className={`level-poll-option nbtc${isMine ? " is-mine" : ""}`}
            title={def.description}
            onMouseEnter={() => onPreview(def.id)}
            onMouseLeave={() => onPreviewEnd?.(def.id)}
            onFocus={() => onPreview(def.id)}
            onBlur={() => onPreviewEnd?.(def.id)}
            onClick={handleClick}
        >
            <span className="level-poll-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
            <span className="level-poll-option-body">
                <span className="level-poll-option-emoji" aria-hidden="true">{def.icon}</span>
                <span className="level-poll-option-text">
                    <span className="level-poll-option-name">{def.name}</span>
                    <span className="level-poll-option-desc">{def.description}</span>
                </span>
            </span>
            <span className="level-poll-option-votes">
                {count} VOTE{count === 1 ? "" : "S"} &middot; {pct}%
            </span>
        </button>
    );
}

function PollCard({ poll, now, signedIn, onVote, onPreview, onPreviewEnd, onSignIn }) {
    if (poll.resolved_at) {
        const winner = poll.winner ? BOOSTS[poll.winner] : null;
        return (
            <div className="level-poll-card level-poll-card-resolved nbtc">
                <span className="level-poll-title">LEVEL {poll.level} VOTE CLOSED</span>
                {winner ? (
                    <p className="level-poll-sub">
                        <span className="level-poll-win-emoji" aria-hidden="true">{winner.icon}</span>
                        <span><strong>{winner.name}</strong> joined the show.</span>
                    </p>
                ) : (
                    <p className="level-poll-sub">No votes came in &mdash; this one is back on the ballot later.</p>
                )}
            </div>
        );
    }

    const closed = new Date(poll.closes_at).getTime() <= now;
    const tutorial = poll.tutorial === true;
    const total = (poll.votes_a || 0) + (poll.votes_b || 0);
    const defA = BOOSTS[poll.option_a];
    const defB = poll.option_b ? BOOSTS[poll.option_b] : null;
    const voted = poll.my_choice ? BOOSTS[poll.my_choice === "a" ? poll.option_a : poll.option_b]?.name : null;

    return (
        <div className="level-poll-card nbtc">
            <div className="level-poll-head">
                <span className="level-poll-title">LEVEL {poll.level} REACHED</span>
                <span className="level-poll-timer">
                    {tutorial
                        ? "YOUR VOTE DECIDES"
                        : closed
                            ? "TALLYING\u2026"
                            : `CLOSES IN ${formatCountdown(poll.closes_at, now)}`}
                </span>
            </div>
            <p className="level-poll-sub">
                {tutorial
                    ? "Two effects unlocked \u2014 pick the one that joins the show. This first vote is yours alone, so it settles the moment you choose."
                    : "Two effects unlocked \u2014 vote for the one that joins the show. Hover one to preview it."}
            </p>
            {!tutorial && (
                <div className="level-poll-quorum">
                    <span className="level-poll-quorum-meter" aria-hidden="true">
                        <span
                            className="level-poll-quorum-fill"
                            style={{ width: `${Math.min(100, Math.round((total / POLL_QUORUM) * 100))}%` }}
                        />
                    </span>
                    <span className="level-poll-quorum-text">
                        {total}/{POLL_QUORUM} VOTES &middot; CLOSES AT 24H OR SOONER ON A LEAD
                    </span>
                </div>
            )}
            <div className="level-poll-options">
                <PollOption
                    poll={poll} def={defA} choice="a" count={poll.votes_a || 0} total={total}
                    signedIn={signedIn} voted={poll.my_choice} closed={closed}
                    onVote={onVote} onPreview={onPreview} onPreviewEnd={onPreviewEnd} onSignIn={onSignIn}
                />
                {defB && (
                    <PollOption
                        poll={poll} def={defB} choice="b" count={poll.votes_b || 0} total={total}
                        signedIn={signedIn} voted={poll.my_choice} closed={closed}
                        onVote={onVote} onPreview={onPreview} onPreviewEnd={onPreviewEnd} onSignIn={onSignIn}
                    />
                )}
            </div>
            <p className="level-poll-foot">
                {voted
                    ? `You voted ${voted}.${defB ? " Pick the other option to switch." : ""}`
                    : signedIn
                        ? "You can change your vote any time before the poll closes."
                        : "Sign in to vote."}
            </p>
        </div>
    );
}

export default function LevelPollBanner({ polls, now, signedIn, onVote, onPreview, onPreviewEnd, onSignIn }) {
    const visible = polls.filter((p) => (
        p.resolved_at
            ? now - new Date(p.resolved_at).getTime() < RESOLVED_FLASH_MS
            : true
    ));
    if (visible.length === 0) return null;

    return (
        <div className="level-poll-banner">
            {visible.map((poll) => (
                <PollCard
                    key={poll.id}
                    poll={poll}
                    now={now}
                    signedIn={signedIn}
                    onVote={onVote}
                    onPreview={onPreview}
                    onPreviewEnd={onPreviewEnd}
                    onSignIn={onSignIn}
                />
            ))}
        </div>
    );
}
