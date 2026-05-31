require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { tavily } = require("@tavily/core");
const { jsonrepair } = require("jsonrepair");
const buildPrompt = require("./prompt");
const buildLinkedInPrompt = require("./linkedinPrompt");

// ── Configuration ────────────────────────────────────────────────────────
const config = {
    corsOrigin: process.env.CORS_ORIGIN || "*",
    serverPort: parseInt(process.env.PORT || process.env.SERVER_PORT || "3000", 10),
    groqApiUrl: process.env.GROQ_API_URL,
    groqModel: process.env.GROQ_MODEL,
    groqApiKey: process.env.GROQ_API_KEY,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    composioBaseUrl: process.env.COMPOSIO_BASE_URL,
    composioApiKey: process.env.COMPOSIO_API_KEY,
};

const app = express();

// ── Tavily client ────────────────────────────────────────────────────────
const tavilyClient = tavily({ apiKey: config.tavilyApiKey });

// ── Multer ────────────────────────────────────────────────────────────────
const upload = multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => {
        const allowed = [
            "text/plain",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only TXT, PDF, DOCX allowed"));
    },
});

app.use(cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── Helper: call Groq ─────────────────────────────────────────────────────
async function callGroq(prompt, maxTokens = 1000) {
    const response = await fetch(config.groqApiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.groqApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: config.groqModel,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }],
        }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`Groq error: ${data.error.message}`);
    return data.choices?.[0]?.message?.content || "";
}

// ── Helper: parse resume ──────────────────────────────────────────────────
async function parseResume(file) {
    const filePath = file.path;
    if (file.mimetype === "text/plain") {
        return fs.readFileSync(filePath, "utf-8");
    } else if (file.mimetype === "application/pdf") {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
    } else {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
}

// ── Helper: safe JSON parse (with auto-repair) ──────────────────────────────
function safeParseJSON(raw) {
    // 1. Strip markdown code fences
    let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    // 2. Extract the first { ... } block — drops any LLM commentary after JSON ends
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1);
    }

    // 3. Direct parse (fastest path)
    try { return JSON.parse(cleaned); } catch { /* fall through */ }

    // 4. jsonrepair: handles unescaped quotes, trailing commas, single quotes, etc.
    try { return JSON.parse(jsonrepair(cleaned)); } catch { /* fall through */ }

    // 5. Manual smart-quote fix + trailing comma removal, then retry
    const repaired = cleaned
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(repaired); } catch { /* fall through */ }

    // 6. Last resort: jsonrepair on manually-repaired string
    return JSON.parse(jsonrepair(repaired));
}

// ── Helper: send SSE event ────────────────────────────────────────────────
function sse(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Real web research via Tavily ──────────────────────────────────────────
async function researchWithTavily(company, role, send) {
    const queries = [
        { label: "Mission & Products", q: `${company} company overview mission products services` },
        { label: "Tech Stack & Engineering", q: `${company} tech stack engineering blog infrastructure` },
        { label: "Engineering Culture", q: `${company} engineering culture team size engineering blog` },
        { label: "Recent News & Funding", q: `${company} recent news funding launch 2024 2025` },
        { label: "Challenges & Strategy", q: `${company} business challenges strategy roadmap` },
    ];

    const allSnippets = [];
    const sources = [];

    // Run searches sequentially so we can stream each one
    for (const { label, q } of queries) {
        send("progress", { step: `🔍 Searching: ${label}…`, source: null });

        try {
            const result = await tavilyClient.search(q, {
                maxResults: 3,
                searchDepth: "basic",
            });

            const hits = result.results || [];
            hits.forEach(r => {
                sources.push({ title: r.title, url: r.url, label });
                allSnippets.push(`[${label}] ${r.title}: ${r.content?.slice(0, 400) || r.snippet || ""}`);
            });

            // Stream each source to the frontend as it arrives
            hits.forEach(r => {
                send("source", { label, title: r.title, url: r.url });
            });

        } catch (err) {
            console.warn(`Tavily search failed for "${label}":`, err.message);
            send("progress", { step: `⚠ Could not fetch: ${label}`, source: null });
        }
    }

    return { snippets: allSnippets.join("\n\n"), sources };
}

app.get("/", (req, res) => {
    res.send("AI Cold Email Backend Running 🚀");
});

// ── Route ─────────────────────────────────────────────────────────────────
app.post("/generate", upload.single("resume"), async (req, res) => {
    let filePath = null;

    // ── Set SSE headers ───────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    const send = (event, data) => sse(res, event, data);

    try {
        const { role, company, jobDescription = "" } = req.body;

        if (!req.file) { send("error", { message: "Resume required" }); return res.end(); }
        if (!role) { send("error", { message: "Role required" }); return res.end(); }
        if (!company) { send("error", { message: "Company required" }); return res.end(); }

        filePath = req.file.path;

        // ── Step 1: Parse resume ──────────────────────────────────────────
        send("progress", { step: "📄 Parsing your resume…", source: null });
        const resumeText = await parseResume(req.file);

        // ── Step 2: Real web research ─────────────────────────────────────
        send("progress", { step: `🌐 Researching ${company} across the web…`, source: null });

        let companyResearch = {};
        let sources = [];

        if (process.env.TAVILY_API_KEY) {
            const { snippets, sources: foundSources } = await researchWithTavily(company, role, send);
            sources = foundSources;

            send("progress", { step: "🧠 Synthesising research with AI…", source: null });

            // Use Groq to synthesise the real web content into structured JSON
            const synthesisPrompt = `You are a company research analyst. Analyse the web search results below about "${company}" and return a JSON profile for a "${role}" applicant.

RULES (follow strictly):
- Return ONLY a valid JSON object. No markdown, no backticks, no text before or after.
- Start your response with { and end with } — nothing else.
- Keep every value SHORT (under 25 words).
- Do NOT use colons inside values. Do NOT use double-quotes inside values.
- If something is not in the results, write exactly: not found

FORMAT:
{
  "mission": "what the company does and their core goal",
  "product": "main product or service and what makes it unique",
  "techStack": "known technologies from the search results",
  "scale": "users, transactions, or team size if mentioned",
  "engineeringCulture": "what their engineering culture is known for",
  "recentNews": "most recent news or funding round found",
  "challenges": "key technical or business challenges they face",
  "talkingPoint": "one specific thing a ${role} applicant should mention"
}

WEB SEARCH RESULTS:
${snippets.slice(0, 6000)}
`;
            try {
                const synthesisRaw = await callGroq(synthesisPrompt, 800);
                console.log("[Synthesis raw]:", synthesisRaw.slice(0, 120));
                companyResearch = safeParseJSON(synthesisRaw);
                companyResearch.sources = sources;
            } catch (err) {
                console.warn("Synthesis parsing failed:", err.message);
                // Provide minimal usable fallback so emails can still be generated
                companyResearch = {
                    mission: `${company} — research synthesis failed`,
                    talkingPoint: `I've been researching ${company} and am impressed by what you're building.`,
                    sources,
                };
            }
        } else {
            // Fallback if no Tavily key: honest placeholder
            send("progress", { step: "⚠ No TAVILY_API_KEY — skipping web research", source: null });
            companyResearch = { talkingPoint: `Add TAVILY_API_KEY to .env for real research about ${company}.`, sources: [] };
        }

        send("research", companyResearch);

        // ── Step 3: Generate emails + LinkedIn in parallel ────────────────
        send("progress", { step: "✍ Writing 3 cold emails…", source: null });

        const emailPrompt = buildPrompt({ role, company, resume: resumeText, research: companyResearch, jobDescription });
        const linkedInPromptText = buildLinkedInPrompt({ role, company, resume: resumeText, research: companyResearch, jobDescription });

        const [emailRaw, linkedInRaw] = await Promise.all([
            callGroq(emailPrompt, 2000),
            callGroq(linkedInPromptText, 400),
        ]);

        let emails;
        try {
            emails = safeParseJSON(emailRaw);
        } catch (parseErr) {
            console.error("Email JSON parse failed:", parseErr.message);
            console.error("Email raw output (first 500 chars):", emailRaw.slice(0, 500));
            send("error", { message: "Email generation failed — the AI returned malformed output. Please try again." });
            return res.end();
        }

        let linkedin = { message: "", characterCount: 0 };
        try {
            linkedin = safeParseJSON(linkedInRaw);
            console.log("LinkedIn message generated, chars:", linkedin.message?.length);
        } catch {
            linkedin = { message: linkedInRaw.slice(0, 300).trim(), characterCount: linkedInRaw.length };
        }

        send("emails", { emails });
        send("linkedin", linkedin);
        send("done", {});

    } catch (err) {
        console.error("Server error:", err.message);
        send("error", { message: err.message });
    } finally {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.end();
    }
});

// ══════════════════════════════════════════════════════════════════════════
// Composio Gmail routes — pure REST, no SDK
// ══════════════════════════════════════════════════════════════════════════

async function composioFetch(path, opts = {}) {
    const apiKey = config.composioApiKey;
    if (!apiKey) throw new Error("COMPOSIO_API_KEY not set in .env");

    const res = await fetch(`${config.composioBaseUrl}${path}`, {
        ...opts,
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            ...(opts.headers || {}),
        },
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
        const msg = data?.message || data?.error?.message || data?.raw || `HTTP ${res.status}`;
        console.error(`[Composio] ${res.status} ${path}:`, msg);
        throw new Error(msg);
    }
    return data;
}

// ── Step 0 (internal): get-or-create the Gmail auth config ID ─────────────
// Called lazily by /gmail/connect so we never need to hardcode an ID.
let _gmailAuthConfigId = null;

async function getGmailAuthConfigId() {
    if (_gmailAuthConfigId) return _gmailAuthConfigId;

    // 1. Check if one already exists
    const list = await composioFetch("/v3/auth_configs?toolkit=gmail&page=1&pageSize=10");
    const existing = (list?.items ?? []).find(
        c =>
            (c.toolkit?.slug || c.toolkit || "")
                .toLowerCase() === "gmail" &&
            c.type === "use_composio_managed_auth"
    );
    if (existing) {
        _gmailAuthConfigId = existing.id;
        console.log("[Composio] Reusing Gmail auth config:", _gmailAuthConfigId);
        return _gmailAuthConfigId;
    }

    // 2. Create one
    const created = await composioFetch("/v3/auth_configs", {
        method: "POST",
        body: JSON.stringify({
            toolkit: { slug: "gmail" },
            auth_config: {
                name: "gmail-managed",
                type: "use_composio_managed_auth",
                authScheme: "OAUTH2",
            },
        }),
    });
    _gmailAuthConfigId = created?.auth_config?.id ?? created?.id;
    console.log("[Composio] Created Gmail auth config:", _gmailAuthConfigId);
    return _gmailAuthConfigId;
}

// ── GET /gmail/status ─────────────────────────────────────────────────────
app.get("/gmail/status", async (req, res) => {
    try {
        const data = await composioFetch(
            "/v3/connected_accounts?toolkit=gmail&page=1&pageSize=10"
        );

        const accounts = data?.items ?? [];

        console.log("[Connected accounts]", JSON.stringify(accounts, null, 2));

        const active = accounts.find(a => {
            const toolkitSlug =
                typeof a.toolkit === "string"
                    ? a.toolkit
                    : a.toolkit?.slug;

            return (
                toolkitSlug?.toLowerCase() === "gmail" &&
                ["ACTIVE", "CONNECTED"].includes(
                    (a.status || "").toUpperCase()
                )
            );
        });

        res.json({
            connected: !!active,
            status: active?.status ?? "not_connected",
        });

    } catch (err) {
        console.error("[Gmail status error]", err.message);

        res.status(500).json({
            connected: false,
            error: err.message,
        });
    }
});

// ── GET /gmail/connect ────────────────────────────────────────────────────
app.get("/gmail/connect", async (req, res) => {
    try {
        const authConfigId = await getGmailAuthConfigId();

        const data = await composioFetch("/v3.1/connected_accounts/link", {
            method: "POST",
            body: JSON.stringify({
                auth_config_id: authConfigId,
                user_id: "default",
            }),
        });

        const redirectUrl = data?.redirectUrl ?? data?.redirect_url ?? data?.connectionData?.val?.redirectUrl;
        if (!redirectUrl) throw new Error("No redirect URL in Composio response: " + JSON.stringify(data));

        res.json({ url: redirectUrl });
    } catch (err) {
        console.error("[Gmail connect error]", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /send-email ──────────────────────────────────────────────────────
app.post("/send-email", express.json(), async (req, res) => {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
        return res.status(400).json({
            error: "to, subject, and body are required",
        });
    }

    try {
        const data = await composioFetch(
            "/v3.1/tools/execute/GMAIL_SEND_EMAIL",
            {
                method: "POST",
                body: JSON.stringify({
                    user_id: "default",
                    arguments: {
                        recipient_email: to,
                        subject,
                        body,
                    },
                }),
            }
        );

        console.log("Email sent:", data);

        res.json({
            success: true,
            result: data,
        });

    } catch (err) {
        console.error("[Send email error]", err.message);

        res.status(500).json({
            error: err.message,
        });
    }
});

app.listen(config.serverPort, () => console.log(`Backend running on http://localhost:${config.serverPort}`));