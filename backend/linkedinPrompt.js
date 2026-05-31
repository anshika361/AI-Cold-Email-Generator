function buildLinkedInPrompt({ role, company, resume, research = {}, jobDescription = "" }) {
  const jdBlock = jobDescription.trim()
    ? `\nJOB DESCRIPTION:\n${jobDescription.trim()}\n`
    : "";

  return `
════════════════════════════════════════
WHO IS WHO — READ THIS FIRST
════════════════════════════════════════
YOU ARE WRITING A MESSAGE *FROM* THE CANDIDATE *TO* A RECRUITER.
- Candidate = person whose resume is below. They are APPLYING for the job.
- Recruiter = works at "${company}". They can hire the candidate.
- Write in first person: "I built", "I led", "my work"
- Do NOT use the candidate's own name in the message
- Do NOT say "I'm a ${role} at ${company}" — they don't work there yet
- Do NOT start with "Hi [name],"

════════════════════════════════════════
TARGET ROLE: "${role}" at "${company}"
════════════════════════════════════════
This is the EXACT role the candidate is applying for.
Everything in the message must be relevant to THIS role specifically.

WHAT A "${role}" DOES (use this to filter the resume):
${getRoleContext(role)}

════════════════════════════════════════
CANDIDATE RESUME
════════════════════════════════════════
${resume}
${jdBlock}
════════════════════════════════════════
STEP 1 — FILTER RESUME BY ROLE (mental step, not in output)
════════════════════════════════════════
From the resume, extract ONLY what is relevant to "${role}":

A) RELEVANT SKILLS: Which technologies/skills in the resume match "${role}"?
   Examples for different roles:
   - Backend Engineer → Node.js, APIs, databases, microservices, system design
   - Frontend Engineer → React, Vue, CSS, performance, UI/UX
   - DevOps Engineer → CI/CD, Docker, Kubernetes, cloud, automation
   - Data Engineer → pipelines, Spark, Airflow, ETL, SQL, data warehouse
   - ML Engineer → models, training, inference, PyTorch, TensorFlow, MLOps
   - Full Stack → both frontend + backend + deployment
   ✗ IGNORE skills that are NOT relevant to "${role}"

B) RELEVANT ACHIEVEMENT: Find ONE achievement from the resume that a "${role}" hiring manager would care about
   ✗ Only use numbers/facts literally in the resume — never invent
   ✗ Must be relevant to "${role}" — not just any achievement
   ✗ If no numbers exist, use the most relevant project or technology

C) ROLE-RELEVANT TITLE: What is the candidate's most recent title that relates to "${role}"?

D) COMPANY HOOK (optional): ${research.talkingPoint || research.recentNews || research.mission || ""}

════════════════════════════════════════
STEP 2 — PICK OPENING STYLE
════════════════════════════════════════
STYLE A — NUMBER HOOK (if resume has a strong metric relevant to "${role}")
"[Role-relevant metric] — that's what I shipped at [company]. Think it maps to the ${role} work at ${company}."

STYLE B — COMPANY HOOK (if company research has a strong talking point)
"[Specific thing about ${company}] is exactly what I've been building — [role-relevant proof from resume]."

STYLE C — SKILL/PROJECT HOOK (if strong role-relevant project or tech match)
"Built [role-relevant thing from resume] — directly relevant to what a ${role} at ${company} works on. Worth connecting?"

════════════════════════════════════════
STEP 3 — WRITE THE MESSAGE
════════════════════════════════════════
HARD RULES:
✓ Under 300 characters — count carefully
✓ MUST reference something relevant to "${role}" — not generic achievements
✓ Written in first person
✓ Mention "${company}" by name
✓ Include ONE concrete role-relevant fact from the resume
✓ End with: "Worth connecting?" or "Happy to share more." or "Would love to be on your radar."
✓ Sound like a confident peer, not desperate
✗ Do NOT start with "Hi", "Hello", "I am a", "I'm a"
✗ Do NOT use: "passionate", "hardworking", "synergy", "excited to", "would love to connect"
✗ Do NOT mention skills irrelevant to "${role}"
✗ Do NOT say candidate works at "${company}" already
✗ No emojis

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Return ONLY raw JSON. No markdown. No backticks. No explanation.
Start with { and end with }

{
  "style": "A or B or C",
  "message": "Final message under 300 chars, role-specific, from candidate to recruiter",
  "characterCount": 0,
  "highlight": "The exact role-relevant fact from resume you used",
  "relevantSkills": "Comma-separated skills from resume that match ${role}",
  "whyItWorks": "One sentence: why this will make a ${role} hiring manager at ${company} stop scrolling"
}

CRITICAL:
- characterCount must equal actual character count of message
- highlight must be something directly relevant to "${role}"
- Output must be parseable by JSON.parse()
- No trailing commas
`;
}

// Role context helps the LLM know what to look for in the resume
function getRoleContext(role) {
  const contexts = {
    "Backend Engineer": "APIs, microservices, databases (SQL/NoSQL), system design, Node.js/Python/Java/Go, performance, scalability",
    "Frontend Engineer": "React/Vue/Angular, CSS, JavaScript/TypeScript, UI performance, web vitals, responsive design, component libraries",
    "Full Stack Developer": "Both frontend (React/Vue) and backend (Node/Python), databases, REST/GraphQL APIs, deployment",
    "DevOps Engineer": "CI/CD pipelines, Docker, Kubernetes, cloud (AWS/GCP/Azure), infrastructure as code, monitoring, automation",
    "Data Engineer": "ETL pipelines, Spark, Airflow, SQL, data warehouses (Snowflake/BigQuery/Redshift), streaming (Kafka)",
    "ML Engineer": "Model training/deployment, MLOps, PyTorch/TensorFlow, feature engineering, inference optimization, pipelines",
    "Data Scientist": "Statistical modeling, Python, ML algorithms, data analysis, experimentation, A/B testing, visualization",
    "Mobile Developer": "iOS/Android, React Native/Flutter, mobile performance, app store deployment, native APIs",
    "iOS Developer": "Swift, SwiftUI, UIKit, Xcode, CoreData, iOS performance, App Store",
    "Android Developer": "Kotlin/Java, Jetpack Compose, Android SDK, Play Store, mobile architecture",
    "Platform Engineer": "Internal tooling, developer platforms, infrastructure abstraction, SDKs, productivity at scale",
    "Site Reliability Engineer": "Uptime/SLOs/SLAs, incident response, observability, on-call, Kubernetes, automation, chaos engineering",
    "Security Engineer": "AppSec, pentesting, vulnerability assessment, SIEM, IAM, compliance, secure coding",
    "Product Manager": "Product strategy, roadmap, user research, metrics, stakeholder management, PRDs, A/B testing",
    "Engineering Manager": "Team leadership, hiring, delivery, technical strategy, 1:1s, cross-functional collaboration",
    "Software Architect": "System design, architecture patterns, tech decisions, scalability, cross-team technical leadership",
  };
  return contexts[role] || "software engineering, system design, and technical problem solving";
}

module.exports = buildLinkedInPrompt;