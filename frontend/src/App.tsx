import React, { useState, useEffect, useRef } from "react";

type Email = { subject: string; email: string };
type Suggestion = { name: string; domain: string; logo: string };
type LinkedIn = { message: string; highlight?: string; whyItWorks?: string; style?: string; relevantSkills?: string; };
type Recruiter = { name: string; title: string; email?: string; linkedin?: string };
type Source = { label: string; title: string; url: string };
type Research = {
    mission?: string; product?: string; techStack?: string;
    scale?: string; engineeringCulture?: string; recentNews?: string;
    challenges?: string; talkingPoint?: string;
    recruiters?: Recruiter[];
    sources?: Source[];
};

// ── API Configuration ────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CLEARBIT_API_URL = import.meta.env.VITE_CLEARBIT_API_URL || "https://autocomplete.clearbit.com/v1/companies/suggest";

function useDebounce(value: string, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const ALL_ROLES = [
    "Backend Engineer", "Frontend Engineer", "Full Stack Developer",
    "DevOps Engineer", "Data Engineer", "ML Engineer", "Data Scientist",
    "Mobile Developer", "iOS Developer", "Android Developer",
    "Platform Engineer", "Site Reliability Engineer", "Security Engineer",
    "Product Manager", "Engineering Manager", "Software Architect", "Software Developer",
    "Software Engineer", "Project Manager", "Project Lead", "Project Engineer",
];

const EMAIL_STRATEGIES = [
    { label: "Hook", desc: "Lead with Achievement", color: "#6366f1" },
    { label: "Value Pitch", desc: "Lead with Their Challenge", color: "#a855f7" },
    { label: "Insider", desc: "Genuine Interest", color: "#ec4899" },
];



function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`btn-copy ${copied ? "copied" : ""}`}
        >
            {copied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
            ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> {label}</>
            )}
        </button>
    );
}

// ── Email Compose / Send Modal ────────────────────────────────────────────
type ComposeState = { to: string; subject: string; body: string };

function EmailComposeModal({ draft, onClose, gmailConnected, onConnectGmail, onRecheck }: {
    draft: ComposeState;
    onClose: () => void;
    gmailConnected: boolean;
    onConnectGmail: () => Promise<string | null>;
    onRecheck: () => void;
}) {
    const [to, setTo] = useState(draft.to);
    const [subject, setSubject] = useState(draft.subject);
    const [body, setBody] = useState(draft.body);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [connectErr, setConnectErr] = useState("");

    const handleConnect = async () => {
        setConnecting(true); setConnectErr("");
        const err = await onConnectGmail();
        setConnecting(false);
        if (err) setConnectErr(err);
    };

    const handleSend = async () => {
        if (!to.trim()) return setSendError("Please enter a recipient email.");
        setSending(true); setSendError("");
        try {
            const res = await fetch(`${API_BASE_URL}/send-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: to.trim(), subject, body }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Send failed");
            setSent(true);
            setTimeout(onClose, 2000);
        } catch (err: unknown) {
            setSendError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setSending(false);
        }
    };

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const inp: React.CSSProperties = {
        width: "100%", padding: "10px 12px", borderRadius: "8px",
        border: "1px solid var(--border)", background: "rgba(255,255,255,0.04)",
        color: "var(--text-primary)", fontSize: "13px", fontFamily: "inherit",
        outline: "none", boxSizing: "border-box",
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                width: "100%", maxWidth: "560px", borderRadius: "16px",
                background: "rgba(14,14,24,0.98)", border: "1px solid rgba(99,102,241,0.3)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
                display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden",
            }}>
                {/* Header */}
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#ea4335,#fbbc05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "14px" }}>Send via Gmail</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Edit if needed, then confirm to send</div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px", lineHeight: 1, padding: "4px" }}>×</button>
                </div>

                {/* Gmail not connected warning */}
                {!gmailConnected && (
                    <div style={{ borderBottom: "1px solid rgba(251,188,5,0.2)" }}>
                        <div style={{ padding: "12px 22px", background: "rgba(251,188,5,0.08)", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "14px" }}>⚠️</span>
                            <div style={{ flex: 1, minWidth: "160px" }}>
                                <div style={{ fontSize: "12px", fontWeight: 600, color: "#fbbc05" }}>Gmail not connected</div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Connect Gmail via Composio to send directly</div>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button
                                    onClick={onRecheck}
                                    title="Re-check connection status"
                                    style={{ padding: "6px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}
                                >
                                    ↻ Re-check
                                </button>
                                <button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    style={{ padding: "6px 14px", borderRadius: "8px", background: connecting ? "#666" : "#fbbc05", border: "none", color: "#000", fontWeight: 700, fontSize: "12px", cursor: connecting ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}
                                >
                                    {connecting && <span className="spinner" style={{ width: "10px", height: "10px", borderTopColor: "#333" }} />}
                                    {connecting ? "Connecting…" : "Connect Gmail"}
                                </button>
                            </div>
                        </div>
                        {connectErr && (
                            <div style={{ padding: "10px 22px", background: "rgba(239,68,68,0.08)", fontSize: "11px", color: "#f87171", lineHeight: 1.5 }}>
                                ⚠ {connectErr}
                            </div>
                        )}
                    </div>
                )}


                {/* Form */}
                <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "6px" }}>To</label>
                        <input style={inp} placeholder="recruiter@company.com" value={to} onChange={e => setTo(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "6px" }}>Subject</label>
                        <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} />
                    </div>
                    <div>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "block", marginBottom: "6px" }}>Body</label>
                        <textarea
                            style={{ ...inp, minHeight: "220px", resize: "vertical", lineHeight: 1.6 }}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                    </div>

                    {sendError && (
                        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "12px", color: "#f87171" }}>
                            ⚠ {sendError}
                        </div>
                    )}
                    {sent && (
                        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", fontSize: "12px", color: "#4ade80", fontWeight: 600 }}>
                            ✓ Email sent successfully!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "13px" }}>Cancel</button>
                    <button
                        onClick={handleSend}
                        disabled={sending || sent || !gmailConnected}
                        style={{
                            padding: "10px 24px", borderRadius: "8px", border: "none",
                            background: sent ? "#22c55e" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color: "#fff", fontWeight: 700, fontSize: "13px",
                            cursor: sending || sent || !gmailConnected ? "not-allowed" : "pointer",
                            fontFamily: "inherit", opacity: sending ? 0.7 : 1,
                            display: "flex", alignItems: "center", gap: "8px",
                        }}
                    >
                        {sent ? (
                            <>✓ Sent!</>
                        ) : sending ? (
                            <><span className="spinner" style={{ width: "12px", height: "12px" }} /> Sending…</>
                        ) : (
                            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg> Send Email</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ResearchCard({ research, company }: { research: Research; company: string }) {
    const [open, setOpen] = useState(false);
    const rows: { icon: string; label: string; value: string }[] = [
        { icon: "🎯", label: "Mission", value: research.mission || "" },
        { icon: "📦", label: "Product", value: research.product || "" },
        { icon: "⚙️", label: "Tech Stack", value: research.techStack || "" },
        { icon: "📈", label: "Scale", value: research.scale || "" },
        { icon: "🔧", label: "Eng. Culture", value: research.engineeringCulture || "" },
        { icon: "📰", label: "Recent News", value: research.recentNews || "" },
        { icon: "⚡", label: "Challenges", value: research.challenges || "" },
        { icon: "💡", label: "Talking Point", value: research.talkingPoint || "" },
    ].filter(r => r.value);

    const recruiters = research.recruiters || [];

    return (
        <div style={{ marginBottom: "24px", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "14px", overflow: "hidden", background: "rgba(99,102,241,0.02)" }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", background: "rgba(99,102,241,0.08)", border: "none", cursor: "pointer",
                    fontFamily: "inherit", color: "var(--text-primary)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>🔬</span>
                    <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, fontSize: "13px" }}>AI Research & Recruiters at {company}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rows.length} insights + {recruiters.length} contacts · click to {open ? "hide" : "view"}</div>
                    </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, color: "var(--text-muted)" }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <div style={{ padding: "4px 0 12px" }}>
                    {/* Company Info */}
                    <div style={{ padding: "0 18px 12px" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: "1px", margin: "12px 0 8px" }}>Company Overview</div>
                        {rows.map(r => (
                            <div key={r.label} style={{ display: "flex", gap: "12px", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                                <span style={{ fontSize: "15px", flexShrink: 0 }}>{r.icon}</span>
                                <div>
                                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>{r.label}</div>
                                    <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recruiters */}
                    {recruiters.length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px 4px" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Potential Recruiters</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {recruiters.map((rec, idx) => (
                                    <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontSize: "13px", fontWeight: 700 }}>{rec.name}</div>
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{rec.title}</div>
                                            {rec.email && <div style={{ fontSize: "11px", color: "var(--accent-light)", marginTop: "2px" }}>{rec.email}</div>}
                                        </div>
                                        <div style={{ display: "flex", gap: "6px" }}>

                                            {rec.linkedin && (
                                                <a
                                                    href={rec.linkedin} target="_blank" rel="noopener noreferrer"
                                                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
                                                    title="LinkedIn profile"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function App() {
    const [role, setRole] = useState("");
    const [roleQuery, setRoleQuery] = useState("");
    const [showRoles, setShowRoles] = useState(false);

    const [company, setCompany] = useState("");
    const [companyQuery, setCompanyQuery] = useState("");
    const [companySuggestions, setCompanySuggestions] = useState<Suggestion[]>([]);
    const [showCompanies, setShowCompanies] = useState(false);
    const [manualCompany, setManualCompany] = useState(false); // "Other" mode

    const [jobDescription, setJobDescription] = useState("");
    const [showJD, setShowJD] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);

    const [emails, setEmails] = useState<Email[]>([]);
    const [linkedin, setLinkedin] = useState<LinkedIn | null>(null);
    const [research, setResearch] = useState<Research | null>(null);
    const [liveSources, setLiveSources] = useState<Source[]>([]);
    const [liveLog, setLiveLog] = useState<string[]>([]);
    const [showLogPanel, setShowLogPanel] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("");
    const [error, setError] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const manualInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const debouncedCompany = useDebounce(companyQuery, 300);

    // Focus the manual input whenever we switch into manual mode
    useEffect(() => {
        if (manualCompany) {
            setTimeout(() => manualInputRef.current?.focus(), 50);
        }
    }, [manualCompany]);

    const [gmailConnected, setGmailConnected] = useState<boolean | null>(null); // null = checking
    const [compose, setCompose] = useState<ComposeState | null>(null);
    const gmailPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const recheckGmail = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/gmail/status`);

            if (!res.ok) {
                console.error("Status API failed:", res.status);
                setGmailConnected(false);
                return false;
            }

            const d = await res.json();

            console.log("Gmail status:", d);

            setGmailConnected(Boolean(d.connected));

            return Boolean(d.connected);

        } catch (err) {
            console.error("Recheck failed:", err);
            setGmailConnected(false);
            return false;
        }
    };

    // Check on mount
    useEffect(() => { recheckGmail(); }, []);

    // Re-check whenever the user switches back to this tab (e.g. after OAuth)
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") recheckGmail(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);

    const handleConnectGmail = async (): Promise<string | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/gmail/connect`);
            const data = await res.json();
            if (data.error) return data.error;
            if (data.url) {
                window.open(data.url, "_blank");

                // Poll every 3 s for up to 5 min until connected
                if (gmailPollRef.current) clearInterval(gmailPollRef.current);
                let tries = 0;
                gmailPollRef.current = setInterval(async () => {
                    tries++;
                    const connected = await recheckGmail();
                    if (connected || tries >= 100) {
                        clearInterval(gmailPollRef.current!);
                        gmailPollRef.current = null;
                    }
                }, 3000);

                return null;
            }
            return "No redirect URL returned from server.";
        } catch {
            return "Could not reach the server. Is the backend running on port 3000?";
        }
    };

    const hasResults = emails.length > 0 || linkedin != null;

    const filteredRoles = roleQuery.trim()
        ? ALL_ROLES.filter(r => r.toLowerCase().includes(roleQuery.toLowerCase()))
        : ALL_ROLES;

    useEffect(() => {
        if (!debouncedCompany.trim()) { setCompanySuggestions([]); return; }
        fetch(`${CLEARBIT_API_URL}?query=${encodeURIComponent(debouncedCompany)}`)
            .then(r => r.json())
            .then(data => setCompanySuggestions(data.slice(0, 6)))
            .catch(() => setCompanySuggestions([]));
    }, [debouncedCompany]);

    const handleFile = (f: File | null | undefined) => {
        if (f) setFile(f);
    };

    const handleReset = () => {
        setEmails([]); setLinkedin(null); setResearch(null); setError("");
        setLiveSources([]); setLiveLog([]); setShowLogPanel(false);
        setManualCompany(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async () => {
        if (!role) return setError("Please select a role.");
        if (!company) return setError("Please select a company.");
        if (!file) return setError("Please upload your resume.");

        setError("");
        setLoading(true);
        setEmails([]);
        setLinkedin(null);
        setResearch(null);
        setLiveSources([]);
        setLiveLog([]);
        setShowLogPanel(true); // open panel automatically when research starts
        setLoadingStep("Starting…");

        const formData = new FormData();
        formData.append("role", role);
        formData.append("company", company);
        formData.append("resume", file);
        if (jobDescription.trim()) formData.append("jobDescription", jobDescription.trim());

        try {
            const res = await fetch(`${API_BASE_URL}/generate`, { method: "POST", body: formData });
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            // SSE manual parser
            const parseChunk = (chunk: string) => {
                buffer += chunk;
                const blocks = buffer.split("\n\n");
                buffer = blocks.pop() ?? "";

                for (const block of blocks) {
                    const eventLine = block.match(/^event: (.+)$/m);
                    const dataLine = block.match(/^data: (.+)$/m);
                    if (!eventLine || !dataLine) continue;

                    const event = eventLine[1].trim();
                    let data: Record<string, unknown>;
                    try { data = JSON.parse(dataLine[1]); } catch { continue; }

                    if (event === "progress") {
                        const step = data.step as string;
                        setLoadingStep(step);
                        setLiveLog(prev => [...prev, step]);
                    } else if (event === "source") {
                        setLiveSources(prev => [...prev, data as unknown as Source]);
                    } else if (event === "research") {
                        setResearch(data as unknown as Research);
                    } else if (event === "emails") {
                        setEmails((data.emails as Email[]) ?? []);
                    } else if (event === "linkedin") {
                        setLinkedin(data as unknown as LinkedIn);
                    } else if (event === "error") {
                        setError((data.message as string) || "Unknown error");
                    } else if (event === "done") {
                        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                    }
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                parseChunk(decoder.decode(value, { stream: true }));
            }
        } catch {
            setError("Could not reach the server. Is the backend running on port 3000?");
        }

        setLoading(false);
        setLoadingStep("");
    };

    // charCount computed live from actual message string (not AI-reported count which can be stale/wrong)
    const charCount = linkedin?.message?.length ?? 0;
    const charColor = charCount > 280 ? "#f87171" : charCount > 250 ? "#fb923c" : "#22d3ee";

    return (
        <>
            <div className="bg-grid" />
            <div className="bg-glow" />

            <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", padding: "48px 16px 80px" }}>

                {/* ── Hero ── */}
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                        <span className="tag">✦ AI-Powered</span>
                        <span className="tag">Research + Write</span>
                        <span className="tag">LinkedIn Ready</span>
                    </div>
                    <h1 style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "12px" }}>
                        Cold Email <span className="gradient-text">Generator</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "440px", margin: "0 auto" }}>
                        Drop your resume, pick a role &amp; company — get 3 tailored cold emails and a LinkedIn message in seconds.
                    </p>
                </div>

                {/* ── Form card ── */}
                <div className="glass" style={{ maxWidth: "460px", margin: "0 auto", padding: "28px" }}>

                    {/* Role */}
                    <div style={{ marginBottom: "18px", position: "relative" }}>
                        <label className="field-label">Target Role</label>
                        <input
                            className="inp"
                            placeholder="e.g. Full Stack Developer"
                            value={roleQuery}
                            onChange={e => { setRoleQuery(e.target.value); setRole(""); setShowRoles(true); }}
                            onFocus={() => setShowRoles(true)}
                            onBlur={() => setTimeout(() => setShowRoles(false), 150)}
                            autoComplete="off"
                        />
                        {role && <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(8px)", color: "#22d3ee", fontSize: "16px" }}>✓</span>}
                        {showRoles && filteredRoles.length > 0 && (
                            <div className="dropdown" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {filteredRoles.map(r => (
                                    <div key={r} className="dropdown-item" onMouseDown={() => { setRole(r); setRoleQuery(r); setShowRoles(false); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, flexShrink: 0 }}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8L6 7h12z" /></svg>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Company */}
                    <div style={{ marginBottom: "18px", position: "relative" }}>
                        <label className="field-label">Target Company</label>

                        {manualCompany ? (
                            /* ── Manual entry mode ── */
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <input
                                    ref={manualInputRef}
                                    className="inp"
                                    placeholder="Type your company name…"
                                    value={companyQuery}
                                    onChange={e => { setCompanyQuery(e.target.value); setCompany(e.target.value.trim()); }}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => { setManualCompany(false); setCompany(""); setCompanyQuery(""); setCompanySuggestions([]); }}
                                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
                                >
                                    ← Search
                                </button>
                            </div>
                        ) : (
                            /* ── Search / autocomplete mode ── */
                            <>
                                <input
                                    className="inp"
                                    placeholder="e.g. Razorpay, Google…"
                                    value={companyQuery}
                                    onChange={e => { setCompanyQuery(e.target.value); setCompany(""); setShowCompanies(true); }}
                                    onFocus={() => { if (companySuggestions.length > 0) setShowCompanies(true); }}
                                    onBlur={() => setTimeout(() => setShowCompanies(false), 200)}
                                    autoComplete="off"
                                />
                                {company && <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(8px)", color: "#22d3ee", fontSize: "16px" }}>✓</span>}

                                {/* Suggestions dropdown */}
                                {showCompanies && companySuggestions.length > 0 && (
                                    <div className="dropdown" style={{ maxHeight: "256px", overflowY: "auto" }}>
                                        {companySuggestions.map(c => (
                                            <div key={c.domain} className="dropdown-item"
                                                onMouseDown={e => { e.preventDefault(); setCompany(c.name); setCompanyQuery(c.name); setShowCompanies(false); setCompanySuggestions([]); }}
                                            >
                                                <img src={c.logo} alt="" style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "contain", background: "#fff", padding: "1px", flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
                                                <span style={{ fontWeight: 500, flex: 1 }}>{c.name}</span>
                                                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.domain}</span>
                                            </div>
                                        ))}
                                        {/* Other — inside dropdown */}
                                        <div
                                            className="dropdown-item"
                                            onMouseDown={e => { e.preventDefault(); setManualCompany(true); setShowCompanies(false); }}
                                            style={{ borderTop: "1px solid var(--border)", color: "var(--accent-light)", fontStyle: "italic" }}
                                        >
                                            <span style={{ fontSize: "14px" }}>✏️</span>
                                            <span style={{ flex: 1 }}>Not listed — enter manually</span>
                                        </div>
                                    </div>
                                )}

                                {/* Other — always visible below input when something is typed but not selected */}
                                {companyQuery.trim() && !company && (
                                    <button
                                        type="button"
                                        onClick={() => setManualCompany(true)}
                                        style={{
                                            marginTop: "6px", background: "none", border: "none", padding: 0,
                                            cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                                            fontFamily: "inherit",
                                        }}
                                    >
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Can't find it?</span>
                                        <span style={{ fontSize: "11px", color: "var(--accent-light)", fontWeight: 600 }}>Enter "{companyQuery}" manually →</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Job Description — optional collapsible */}
                    <div style={{ marginBottom: "18px" }}>
                        <button
                            type="button"
                            onClick={() => setShowJD(v => !v)}
                            style={{
                                display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none",
                                cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600,
                                textTransform: "uppercase", letterSpacing: "0.7px", fontFamily: "inherit",
                                marginBottom: showJD ? "10px" : 0, padding: 0, transition: "color 0.2s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-light)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                style={{ transform: showJD ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            {showJD ? "Hide" : "Paste Job Description"} (optional)
                            {jobDescription.trim() && <span style={{ color: "#22d3ee", fontSize: "10px" }}>● added</span>}
                        </button>
                        {showJD && (
                            <div style={{ animation: "fadeUp 0.2s ease" }}>
                                <textarea
                                    className="inp"
                                    rows={6}
                                    placeholder="Paste the full job description here… The AI will tailor your emails to match the exact requirements."
                                    value={jobDescription}
                                    onChange={e => setJobDescription(e.target.value)}
                                    style={{ resize: "vertical", lineHeight: 1.6, fontSize: "13px" }}
                                />
                                {jobDescription.trim() && (
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{jobDescription.length} chars</span>
                                        <button onClick={() => setJobDescription("")} style={{ fontSize: "11px", color: "#f87171", background: "none", border: "none", cursor: "pointer", marginLeft: "10px", fontFamily: "inherit" }}>Clear</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Resume upload — drag & drop */}
                    <div style={{ marginBottom: "22px" }}>
                        <label className="field-label">Your Resume</label>
                        <div
                            className={`file-zone ${file ? "has-file" : ""} ${dragging ? "dragging" : ""}`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => {
                                e.preventDefault();
                                setDragging(false);
                                handleFile(e.dataTransfer.files?.[0]);
                            }}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files?.[0])} />
                            {file ? (
                                <div>
                                    <div style={{ fontSize: "22px", marginBottom: "4px" }}>✅</div>
                                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#22d3ee" }}>{file.name}</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{(file.size / 1024).toFixed(0)} KB · click or drop to change</div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ fontSize: "28px", marginBottom: "6px" }}>{dragging ? "📂" : "📄"}</div>
                                    <div style={{ fontSize: "13px", fontWeight: 600, color: dragging ? "var(--accent-light)" : "var(--text-secondary)" }}>
                                        {dragging ? "Drop to upload!" : "Drag & drop your resume"}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>PDF, DOCX, or TXT · or click to browse</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#f87171", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                            ⚠ {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                                <span className="spinner" />
                                {loadingStep || "Generating…"}
                            </span>
                        ) : "✦ Generate Emails & LinkedIn Message"}
                    </button>

                    {loading && (
                        <div style={{ marginTop: "10px", borderRadius: "99px", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
                            <div className="loading-bar" />
                        </div>
                    )}
                </div>

                {/* ── Persistent Research Log Side Panel + Floating Toggle ── */}
                {(liveLog.length > 0 || liveSources.length > 0) && (
                    <>
                        {/* Floating toggle button */}
                        <button
                            onClick={() => setShowLogPanel(v => !v)}
                            style={{
                                position: "fixed", right: showLogPanel ? "352px" : "0", top: "50%", transform: "translateY(-50%)",
                                zIndex: 100, padding: "10px 6px", borderRadius: "10px 0 0 10px",
                                background: "rgba(99,102,241,0.9)", border: "1px solid rgba(99,102,241,0.5)",
                                borderRight: "none", color: "#fff", cursor: "pointer",
                                fontSize: "11px", fontWeight: 700, writingMode: "vertical-rl",
                                textOrientation: "mixed", letterSpacing: "0.5px",
                                transition: "right 0.3s ease", backdropFilter: "blur(8px)",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                            }}
                        >
                            <span style={{ fontSize: "14px", writingMode: "horizontal-tb" }}>{showLogPanel ? "›" : "‹"}</span>
                            <span>SOURCES</span>
                            <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "99px", padding: "2px 5px", fontSize: "10px", writingMode: "horizontal-tb" }}>{liveSources.length}</span>
                        </button>

                        {/* Side panel */}
                        <div style={{
                            position: "fixed", right: showLogPanel ? 0 : "-350px", top: 0, bottom: 0,
                            width: "350px", zIndex: 99,
                            background: "rgba(12,12,20,0.97)", backdropFilter: "blur(16px)",
                            borderLeft: "1px solid rgba(99,102,241,0.2)",
                            display: "flex", flexDirection: "column",
                            transition: "right 0.3s ease",
                            boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
                        }}>
                            {/* Panel header */}
                            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                                <span style={{ fontSize: "16px" }}>🔬</span>
                                <div>
                                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-light)", textTransform: "uppercase", letterSpacing: "0.7px" }}>Research Log</div>
                                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>{liveSources.length} sources found</div>
                                </div>
                                {loading && <span className="spinner" style={{ marginLeft: "auto", width: "12px", height: "12px" }} />}
                            </div>

                            {/* Scrollable content */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                                {/* Steps */}
                                {liveLog.length > 0 && (
                                    <div style={{ padding: "8px 18px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "6px" }}>Progress</div>
                                        {liveLog.map((step, i) => (
                                            <div key={i} style={{
                                                display: "flex", alignItems: "flex-start", gap: "6px",
                                                padding: "3px 0",
                                                opacity: !loading || i === liveLog.length - 1 ? 1 : 0.45,
                                            }}>
                                                <span style={{ fontSize: "10px", marginTop: "2px", flexShrink: 0 }}>{!loading || i < liveLog.length - 1 ? "✓" : "⋯"}</span>
                                                <span style={{ fontSize: "11px", color: !loading || i === liveLog.length - 1 ? "var(--text-secondary)" : "var(--text-muted)", lineHeight: 1.5 }}>{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Sources */}
                                {liveSources.length > 0 && (
                                    <div style={{ padding: "10px 18px 8px" }}>
                                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "8px" }}>Sources Used</div>
                                        {liveSources.map((src, i) => (
                                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                                                style={{
                                                    display: "flex", alignItems: "flex-start", gap: "8px",
                                                    padding: "8px 10px", marginBottom: "4px",
                                                    borderRadius: "8px", textDecoration: "none",
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: "1px solid rgba(255,255,255,0.06)",
                                                    transition: "background 0.15s",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                                            >
                                                <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>📄</span>
                                                <div style={{ overflow: "hidden" }}>
                                                    <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--accent-light)", marginBottom: "2px", opacity: 0.8 }}>#{src.label}</div>
                                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.title}</div>
                                                    <div style={{ fontSize: "10px", color: "#6366f1", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.url.replace(/^https?:\/\//, "")}</div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ── Results ── */}
                {hasResults && (
                    <div ref={resultsRef} style={{ maxWidth: "720px", margin: "52px auto 0" }}>

                        {/* Header + Reset */}
                        <div style={{ textAlign: "center", marginBottom: "28px" }}>
                            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
                                {emails.length} Emails + LinkedIn Message
                            </h2>
                            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
                                Tailored for <span style={{ color: "var(--accent-light)" }}>{role}</span> at{" "}
                                <span style={{ color: "var(--accent-light)" }}>{company}</span>
                                {jobDescription.trim() && <span style={{ color: "#22d3ee" }}> · JD-matched</span>}
                            </p>
                            <button
                                onClick={handleReset}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                    padding: "8px 18px", borderRadius: "8px", border: "1px solid var(--border)",
                                    background: "transparent", color: "var(--text-secondary)", fontSize: "13px",
                                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.85" /></svg>
                                Start Over / Regenerate
                            </button>
                        </div>

                        {/* Research card */}
                        {research && <ResearchCard research={research} company={company} />}

                        {/* LinkedIn block */}
                        {linkedin && (
                            <div style={{ marginBottom: "28px", animation: "fadeUp 0.35s ease" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#0077b5,#00a0dc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: "15px" }}>LinkedIn Connection Message</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Send this when connecting with recruiters at {company}</div>
                                    </div>
                                    {linkedin.style && (
                                        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "99px", background: "rgba(0,119,181,0.15)", border: "1px solid rgba(0,119,181,0.3)", color: "#00a0dc" }}>
                                            Style {linkedin.style}
                                        </span>
                                    )}
                                </div>

                                {/* Message card */}
                                <div style={{ background: "rgba(0,119,181,0.08)", border: "1px solid rgba(0,119,181,0.25)", borderRadius: "14px", padding: "18px 20px" }}>
                                    <p style={{ fontSize: "14px", lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginBottom: "14px" }}>
                                        {linkedin.message}
                                    </p>

                                    {/* Why it works */}
                                    {linkedin.whyItWorks && (
                                        <div style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "8px", padding: "8px 12px", marginBottom: "10px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                            <span style={{ fontSize: "13px", flexShrink: 0 }}>💜</span>
                                            <span style={{ fontSize: "12px", color: "#c084fc", lineHeight: 1.5 }}><strong>Why this works:</strong> {linkedin.whyItWorks}</span>
                                        </div>
                                    )}

                                    {/* From resume */}
                                    {linkedin.highlight && (
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px" }}>
                                            <span style={{ fontSize: "11px", color: "var(--accent-light)", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>📌 FROM RESUME:</span>
                                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{linkedin.highlight}</span>
                                        </div>
                                    )}

                                    {linkedin.relevantSkills && (
                                        <div style={{
                                            display: "flex", alignItems: "flex-start", gap: "6px",
                                            background: "rgba(34,211,238,0.06)",
                                            border: "1px solid rgba(34,211,238,0.2)",
                                            borderRadius: "8px", padding: "8px 12px", marginBottom: "12px"
                                        }}>
                                            <span style={{ fontSize: "11px", color: "#22d3ee", fontWeight: 700, flexShrink: 0 }}>
                                                🎯 MATCHED SKILLS:
                                            </span>
                                            <span style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                                {linkedin.relevantSkills}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                                        <span style={{ fontSize: "12px", fontWeight: 600, color: charColor }}>{charCount}/300 characters</span>
                                        <CopyButton text={linkedin.message} label="Copy Message" />
                                    </div>
                                </div>

                                {/* Find Recruiters section */}
                                <div style={{ marginTop: "14px", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
                                    {/* Header */}
                                    <div style={{ padding: "10px 16px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "13px" }}>🔍</span>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                                            Find {company} Recruiters
                                        </span>
                                        <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>
                                            copy message above → connect
                                        </span>
                                    </div>

                                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {/* Google search — primary, most accurate */}
                                        <a
                                            href={`https://www.google.com/search?q=site:linkedin.com/in+"${encodeURIComponent(company)}"+(recruiter+OR+"talent+acquisition"+OR+"hiring+manager")`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px",
                                                padding: "10px 14px", borderRadius: "9px",
                                                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)",
                                                textDecoration: "none", transition: "all 0.18s",
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.08)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.22)"; }}
                                        >
                                            {/* Google G icon */}
                                            <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-light)" }}>
                                                    Search Google for {company} Recruiters
                                                </div>
                                                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>
                                                    site:linkedin.com/in — finds profiles <em>actually working at {company}</em>
                                                </div>
                                            </div>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>

                                        {/* LinkedIn people search — secondary */}
                                        <a
                                            href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`"${company}" recruiter OR "talent acquisition" OR "hiring manager"`)}&origin=GLOBAL_SEARCH_HEADER`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px",
                                                padding: "10px 14px", borderRadius: "9px",
                                                background: "rgba(0,119,181,0.06)", border: "1px solid rgba(0,119,181,0.2)",
                                                textDecoration: "none", transition: "all 0.18s",
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,119,181,0.13)"; e.currentTarget.style.borderColor = "rgba(0,119,181,0.4)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,119,181,0.06)"; e.currentTarget.style.borderColor = "rgba(0,119,181,0.2)"; }}
                                        >
                                            <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "linear-gradient(135deg,#0077b5,#00a0dc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "12px", fontWeight: 700, color: "#00a0dc" }}>
                                                    Search LinkedIn People
                                                </div>
                                                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>
                                                    Keyword search — use "Current company" filter after opening
                                                </div>
                                            </div>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00a0dc" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        {linkedin && emails.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px" }}>COLD EMAILS</span>
                                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                            </div>
                        )}

                        {/* Email cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {emails.map((e, i) => {
                                const strategy = EMAIL_STRATEGIES[i] ?? { label: `Email ${i + 1}`, desc: "", color: "#6366f1" };
                                return (
                                    <div key={i} className="email-card">
                                        <div className="email-card-header">
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                                                        {/* Strategy badge */}
                                                        <span style={{
                                                            fontSize: "10px", fontWeight: 700, padding: "3px 10px",
                                                            borderRadius: "99px", letterSpacing: "0.4px",
                                                            background: `${strategy.color}22`,
                                                            border: `1px solid ${strategy.color}55`,
                                                            color: strategy.color,
                                                        }}>
                                                            {strategy.label}
                                                        </span>
                                                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{strategy.desc}</span>
                                                        {jobDescription.trim() && (
                                                            <span className="tag" style={{ fontSize: "10px", padding: "2px 8px", marginLeft: "auto", borderColor: "rgba(34,211,238,0.3)", color: "#22d3ee" }}>JD-matched</span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                                                        {e.subject}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="email-body">{e.email}</div>
                                        <div style={{ display: "flex", gap: "10px", padding: "0 20px 20px" }}>
                                            <button
                                                onClick={() => setCompose({ to: "", subject: e.subject, body: e.email })}
                                                style={{
                                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                                    padding: "8px 16px", borderRadius: "8px", border: "none",
                                                    background: "linear-gradient(135deg,#ea4335,#fbbc05)",
                                                    color: "#fff", fontWeight: 700, fontSize: "12px",
                                                    cursor: "pointer", fontFamily: "inherit",
                                                }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                                Send Mail
                                            </button>
                                            <CopyButton text={`Subject: ${e.subject}\n\n${e.email}`} label="Copy Email" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bottom reset */}
                        <div style={{ textAlign: "center", marginTop: "40px" }}>
                            <button
                                onClick={handleReset}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    padding: "12px 24px", borderRadius: "10px", border: "1px solid var(--border)",
                                    background: "transparent", color: "var(--text-secondary)", fontSize: "14px",
                                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.85" /></svg>
                                Try a Different Role or Company
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Email Compose Modal ── */}
            {compose && (
                <EmailComposeModal
                    draft={compose}
                    onClose={() => setCompose(null)}
                    gmailConnected={gmailConnected ?? false}
                    onConnectGmail={handleConnectGmail}
                    onRecheck={recheckGmail}
                />
            )}
        </>
    );
}

export default App;