function buildPrompt({ role, company, resume, research = {}, jobDescription = "" }) {
  const jdBlock = jobDescription.trim()
    ? `\n--- JOB DESCRIPTION (use this to tailor emails precisely) ---\n${jobDescription.trim()}\n------------------------------------------------------------`
    : "";

  const researchBlock = `
--- COMPANY INTELLIGENCE ---
Company:             ${company}
Mission:             ${research.mission || "A leading tech company"}
Core Product:        ${research.product || "N/A"}
Tech Stack:          ${research.techStack || "N/A"}
Scale:               ${research.scale || "N/A"}
Engineering Culture: ${research.engineeringCulture || "N/A"}
Recent News:         ${research.recentNews || "N/A"}
Key Challenges:      ${research.challenges || "N/A"}
Best Talking Point:  ${research.talkingPoint || "N/A"}
----------------------------`;

  return `
You are helping a candidate write cold job application emails IN THEIR OWN VOICE.
The candidate is applying for the role of "${role}" at "${company}".
Write as if YOU ARE the candidate — use "I", "my", "I've", "I'd".
This is a real email the candidate will copy and send directly.

${researchBlock}
${jdBlock}
CANDIDATE RESUME:
${resume}

════════════════════════════════════════
EXTRACT FROM RESUME BEFORE WRITING
════════════════════════════════════════
Before generating emails, identify:
- Candidate's full name
- Email address
- Phone number
- LinkedIn / GitHub / Portfolio (if present)
- Top 3 quantified achievements (numbers, scale, impact)
- Most relevant skills for "${role}"
- Most recent job title and company

Use all of the above in the emails below.

════════════════════════════════════════
EMAIL STRATEGIES — 3 different approaches
════════════════════════════════════════

EMAIL 1 — "LEAD WITH ACHIEVEMENT"
- I open by stating my single strongest, most relevant accomplishment
- I connect it directly to what ${company} is building or solving
- I briefly mention my background and why I want THIS role at THIS company
- I end with a polite request for a call

EMAIL 2 — "LEAD WITH THEIR CHALLENGE"  
- I open by acknowledging a real challenge or goal ${company} is facing (from research)
- I explain how my specific experience makes me the right person to help
- I back it with 1–2 concrete achievements from my resume
- I sound confident and direct, like someone who knows their worth
- I close with a clear ask

EMAIL 3 — "GENUINE INTEREST"
- I reference something specific about ${company} — a product, recent news, or mission
- I explain why it resonates with me personally and professionally
- I share what I bring to the table
- I keep it warm, human, and shorter than the other two
- I close with a relaxed, low-pressure CTA

════════════════════════════════════════
FORMAL EMAIL STRUCTURE — follow exactly
════════════════════════════════════════

Each email MUST follow this layout:

Subject: [subject line]

To: Hiring Manager
From: [My Full Name] — extracted from resume

Dear Hiring Manager,

[First paragraph — hook or opening, 2–3 sentences]

[Second paragraph — my experience, achievements, and fit, 3–4 sentences]

[Third paragraph — why ${company} specifically, and my ask, 2–3 sentences]

Best regards,
[My Full Name]
[My Email Address]
[My Phone Number]
[My LinkedIn / GitHub / Portfolio]

════════════════════════════════════════
WRITING RULES — follow strictly
════════════════════════════════════════
✓ Write in first person — "I built", "I led", "My work", "I'd love"
✓ Sound like a real person wrote this, not an AI or template
✓ Subject line: under 8 words, specific and intriguing — NOT "Applying for ${role}"
✓ Mention "${company}" at least once in the body
✓ Include at least ONE number or metric from my resume (e.g. "reduced load time by 60%")
✓ Reference at least ONE specific thing from the company research
✓ Each email must feel and read differently from the others
✓ 120–160 words for the body (between greeting and sign-off)
✗ No buzzwords: "passionate", "hardworking", "synergy", "leverage", "team player"
✗ No vague endings — always end with a clear, specific next step
✗ Do not repeat the same opening line across emails
✓ Tone: warm, confident, professional — like a message from a capable peer

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Return ONLY a raw JSON array.
No markdown. No backticks. No code fences. No explanation. No preamble.
Start with [ and end with ]

[
  {
    "subject": "Subject line here",
    "email": "To: Hiring Manager\\nFrom: John Doe\\n\\nDear Hiring Manager,\\n\\n[paragraph 1]\\n\\n[paragraph 2]\\n\\n[paragraph 3]\\n\\nBest regards,\\nJohn Doe\\[email protected]\\n+91 98765 43210\\nlinkedin.com/in/johndoe"
  },
  {
    "subject": "...",
    "email": "..."
  },
  {
    "subject": "...",
    "email": "..."
  }
]

CRITICAL:
- Use \\n for line breaks — NOT actual newlines inside the JSON string
- Output must be directly parseable by JSON.parse()
- No trailing commas
- Sign-off must use real contact details extracted from the resume
`;
}

module.exports = buildPrompt;