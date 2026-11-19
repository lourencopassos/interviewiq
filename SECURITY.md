# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (GitHub private vulnerability reporting). Do not open a public issue for security problems.

Include what you found, how to reproduce it, and what an attacker could do with it. You should get a first response within a week. Once a fix is merged, you will be credited in the advisory unless you prefer otherwise.

## Supported versions

Only the latest `main` is supported. There are no maintained release branches; fixes land on `main`.

## Threat model

InterviewIQ is a **single-user, self-hosted** app. You run it on your own machine with your own API keys.

What it assumes:

- It runs as one Node process bound to `127.0.0.1`, with Postgres bound to `127.0.0.1:5436`. Both are the defaults.
- **There is no authentication.** Sessions are owned by an anonymous id generated in the browser (stored in localStorage and mirrored to a cookie). It keeps one browser's sessions apart from another's; it is not a login.
- If you expose it beyond localhost, you put it behind a reverse proxy that does authentication.

What that means in practice:

- **A public deployment without an auth proxy is unsafe.** Anyone who can reach it can start interviews and spend your Anthropic, OpenAI, ElevenLabs and D-ID credits, and can try to read sessions (CVs, transcripts, reports) by guessing or obtaining ids.
- CVs, transcripts, coach notes and reports are stored in plaintext in Postgres; saved postings and the CV are also in the browser's localStorage. Protect the machine and the database volume accordingly.
- Text you provide (job descriptions, CVs, answers) and company web search results are sent to the AI providers as part of prompts.

**In scope:**

- Ways for another website you visit to make your local instance act (spend keys, read or change data), for example by bypassing the cross-site request check.
- Ways for one browser's client id to read, change or delete another client id's sessions on the same instance.
- Leaking API keys, provider error bodies or server internals to the browser.
- Stored or reflected XSS, including through AI output or study-plan links.
- Prompt injection through CVs, job descriptions, transcripts or web search results that causes actions beyond producing bad interview content.
- Defaults that expose the app or the database to the network.

**Out of scope:**

- Anything that requires running the app publicly without an authenticating proxy, since that setup is documented as unsupported.
- Spend from your own use of the app, provider outages, or provider-side data handling.
- Missing hardening that only matters for multi-user hosting (accounts, roles, per-user quotas).
- Findings in dependencies with no demonstrated impact on InterviewIQ (please report those upstream).
