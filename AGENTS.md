<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Delivery and automatic deployment

After completing an authorized change, run the relevant checks, push the reviewed
commit and verify its automatic deployment. The user reviews the running app with
Claude, so report the exact deployed HTTPS URL and the source commit. Use the
configured preview deployment for feature work and production for main. Keep
preview access usable for the intended external reviewer without exposing keys,
private notices or bypass tokens.

Use Vercel's native Git integration for deployment because the user reports that
GitHub Actions capacity is exhausted. Run the relevant checks locally before
pushing; Actions checks may resume separately when capacity returns. An initial
Vercel project/account connection is required. Report a missing connection as a
deployment blocker and give the concrete setup steps. A successful build, push,
skipped job or screenshot is not a successful deployment. Do not invent a URL,
merge a PR automatically or change hosting accounts to conceal a blocker.

## Private planning material

The full StillValid product plan and its private source references must remain
outside this public repository. Keep the original private Page or a separately
verified private GitHub repository for sharing it with Claude. GitHub does not
support a private file inside a public repository. Public implementation and
deployment documentation may summarize behavior without copying private plan
content, email addresses, mailbox links or credentials. Verify private repository
visibility before uploading the plan; do not make the application repository
private or publish the plan as an unlisted file or gist.
