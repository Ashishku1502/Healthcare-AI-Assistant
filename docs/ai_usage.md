# AI-use log
**Tools:** Claude (Anthropic) for planning, code scaffolding, tests, cost sheet, drafts of docs. I reviewed outputs and must be able to explain every line.
**Three most useful prompts:** (1) A long build prompt asking Claude to act as engineer + safety reviewer, inspect before coding, build one milestone at a time with server-enforced confirmation and tenant isolation. (2) "Fix all issues right way working" after I shared the brief: it produced the call-by-call safety tests (calls 2-7). (3) "Build a call simulator": it produced the speech-in / speech-out test console with latency and a filler after 1.5 s.
**Two places the tool was wrong or generic (true in this build):**
1. Urgent-symptom rule missed "seene mein thoda dard" (call 5) in the first version, because the pattern only matched "seene mein dard". I found it by writing a test from the brief's call 5 and widened the pattern; it now overrides booking.
2. The first cost sheet pointed formulas at the wrong input rows (ceiling showed Rs 2,500 and the hybrid cost was negative). Recalculation exposed it; I corrected the references and re-checked every total by hand: telephony 1,335 min x 0.60 = Rs 801.
## What I skimped on
Real telephony and voice pipeline (simulated only), reminder sender, hand-polished diagrams, Marathi beyond safety lines, concurrent booking load test. Time went to the safety slice and the economics because they decide whether v1 is safe and viable.
