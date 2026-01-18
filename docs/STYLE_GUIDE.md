# HealthAgent Frontend Style Guide
*A design + product north star for the HealthAgent UI.*

HealthAgent is **not** an “Apple Health dashboard”.
It is a **decision interface**: a tight, calm system that compresses messy health data into clear signals and obvious next actions.

This guide exists to keep future UI changes consistent with that intent.


## Product intent (what we’re building)

HealthAgent helps a user answer three questions quickly:

1) **Am I on track?**  
2) **What changed recently?**  
3) **What should I do next?**

The frontend should prioritise:
- Direction over detail
- Trends over snapshots
- Actions over charts
- Clarity over completeness


## Core user personas

### Primary persona: The Intentional Optimiser
**Profile:** tech-ish, systems-minded, tracks food/training, wants control without obsession.  
**Context:** busy weeks, fluctuating sleep, wants health to support life rather than dominate it.

**Goals**
- Progress toward a specific outcome (e.g. weight trend, performance, energy)
- Catch problems early (before they compound for weeks)
- Convert messy reality into a clear weekly plan

**Behaviours**
- Daily check-in: 30–60 seconds (glance + sanity check)
- Weekly review: read synthesis, decide adjustments
- Cares about trendlines and rates of change more than single datapoints

**Pain points**
- Too many numbers → decision paralysis
- Tracking effort without behaviour change
- Shaming / nagging → avoidance

**What the UI must deliver**
- Compress complexity into **1–3 actionable conclusions**
- Show **direction + confidence** (“weight trending down at target pace”)
- Make “what to do next” feel obvious (key levers + suggested adjustments)

**Success looks like**
> “I know what kind of week I’m having, and what to do about it.”


### Secondary persona: The Low-Friction Maintainer
**Profile:** health-aware but not “into tracking”; may have been burned by obsessive monitoring.  
**Context:** wants stability, hates dashboards, gets overwhelmed easily.

**Goals**
- Maintain baseline habits and avoid spirals
- Notice when something is off (sleep debt, under-recovery, stress)
- Make small corrections without overhauling life

**Behaviours**
- Opens the app 2–3× per week
- Responds well to “green/yellow/red” state framing
- Wants reassurance and calm as much as optimisation

**Pain points**
- Graphs feel like homework
- Metric overload causes guilt or avoidance
- Doesn’t trust “AI advice” unless grounded in visible evidence

**What the UI must deliver**
- One “today/this week state” snapshot + one gentle suggestion
- Clear separation between **signals (facts)** and **interpretation (insight)**
- Progressive disclosure: details only when something looks off

**Success looks like**
> “Nothing is on fire. One small adjustment will help.”


## Design principles (non-negotiables)

### 1) Action > information
If a metric cannot plausibly change behaviour, it should not be prominent.
Default view should answer: **what now?**

### 2) Trends > snapshots
Prefer:
- slopes / weekly averages
- “since last week” deltas
- momentum indicators  
Over raw daily noise.

### 3) Progressive disclosure
Start simple.
Users should only “pay the complexity cost” when needed.

### 4) Narrative first, numbers as evidence
The UI should lead with a short synthesis.
Numbers, charts, and tables exist to support and verify that synthesis.

### 5) Trust via traceability
Every interpretation or recommendation must be explainable.
The user should be able to click through to “why”.

### 6) Calm, not compulsive
The interface should reduce anxiety and compulsive checking:
- avoid flashing indicators
- avoid gamification loops
- focus on steady improvements


## Information hierarchy (what matters most)

**Ranked by priority:**

1) **Overall status** (on track / drifting / off track)
2) **What changed recently** (since last week)
3) **Key levers** (highest impact next action)
4) **Goal-tracking context** (targets, slopes)
5) **Deep dives** (trends tables, raw metrics, history)


## Key screens (recommended intent)

### Home (default)
Purpose: **30-second answer**
- System health (is pipeline updating?)
- Current status + one-line summary
- On-track indicators (trend vs goal)
- 1–3 key levers (most impactful next actions)
- Link to Weekly Insight / Trends for drill-down

Home should never feel like a “wall of stats”.

### Insights (weekly narrative)
Purpose: **weekly review + decision**
- Short synthesis
- “What changed since last week” (diff)
- Evidence links (sleep dipped Tue–Thu → show slice)
- Suggested adjustments (conservative + specific)

### Trends (drill-down)
Purpose: **proof + debugging**
- Charts/tables to confirm the story
- Mainly for the Optimiser persona
- Avoid making Trends the “main experience”


## Voice, tone, and copy rules

**Tone**
- Calm, concise, practical
- Neutral and non-moralising
- “Coach-like”, not “judge-like”
- No fake hype, no guilt

**Do**
- “You’re trending slightly above target.”
- “Sleep consistency dropped midweek; this likely affected appetite.”
- “One change: add a 20-minute walk after lunch.”

**Don’t**
- “You failed your calories.”
- “Bad behaviour.”
- “Crush your goals 🔥”

**Language**
- Prefer *observations* over *verdicts*  
  “Weight trend flat for 10 days” > “stagnating”
- Use uncertainty when appropriate  
  “Likely”, “may be contributing”, “consistent with”
- Keep recommendations bounded  
  small, reversible, testable


## Interaction & layout rules

### Default to glanceable blocks
Each section should be readable in ~2 seconds:
- label
- primary value
- direction (up/down/flat)
- short interpretation

### Prefer “stacked evidence”
Structure insights like:
- Claim → evidence → implication → lever

Example:
- “Energy dipped this week”
- “Sleep avg down 45m, bedtime drifted”
- “Higher hunger + lower training consistency”
- “Lever: bring wake time within 30m window”

### Respect attention
Avoid:
- dense tables above the fold
- multiple competing highlights
- more than 1–2 callouts per screen


## Data presentation rules

### Use small set of “headline metrics”
Only elevate metrics that relate to common decisions:
- weight trend + rate
- calorie adherence (avg vs target)
- protein adherence (avg vs target)
- steps/activity floor
- sleep duration + consistency
- training frequency
- recovery proxy (RHR/HRV if reliable)

Everything else belongs in Trends or hidden detail.

### Prefer weekly aggregation
Use:
- weekly averages
- 7-day rolling
- deltas vs previous week
Over noisy daily values.

### Explicitly show confidence
If data is missing, say so plainly:
- “No sleep data for 3 nights — trends may be unreliable.”

Avoid “filling in” with implied certainty.


## Visual style ideas (directional, not prescriptive)

These are guiding constraints — not a strict UI kit.

**Overall feel**
- Minimal, airy, “executive summary”
- Slightly “clinical but warm”
- Low-contrast background with clear hierarchy
- Few colours, used intentionally

**Hierarchy**
- One primary headline per screen
- Secondary sections are calm and clearly separated
- No competing bold blocks

**Status signalling**
Use subtle, consistent signalling:
- good / warning / attention
- avoid aggressive red unless urgent or broken

**Spacing**
- generous padding
- consistent card rhythm
- avoid cluttered grid views


## Anti-goals (things we will NOT build)

- A full Apple Health mirror
- A “quantified self dashboard” with 40 tiles
- A gamified streak/XP app
- A chatty AI “life coach” UI
- A graph playground that hides the point


## Decisions framework (for future features)

Before adding anything, answer:

1) What decision does this enable?
2) Is this a **headline signal** or a **debug detail**?
3) Does it reduce confusion or add complexity?
4) Can it be expressed as a lever, trend, or weekly change?
5) Is it safe and calm to view daily?

If it fails these, it belongs in Trends (or nowhere).


## “Definition of good” for the UI

A good HealthAgent UI makes the user feel:

- informed, not overwhelmed
- guided, not bossed around
- calm, not compulsive
- able to act, not just observe

If the UI ever feels like “a dashboard”, it’s drifting from purpose.
