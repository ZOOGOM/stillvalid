# StillValid submission copy

Prepared for the **Indie developer track, individual entrant**, under **Build for Your World**. The entrant confirmed the track. Submission is to be completed later by the entrant; this file does not establish a submitted entry. The authenticated form's field names, character limits and video requirements still need checking.

## Project name and tagline

**StillValid — Saved a notice. Still the same?**

## Short description

StillValid compares a saved notice photo with official web material and shows supported differences with quotes you can inspect. It uses Meta's muse-spark-1.3-contributor model (a lower-priced variant; submitted notices may be used to improve Meta's models under Meta's terms, as the in-app privacy notice states) for visual transcription, source discovery and structured comparison, followed by deterministic evidence checks. Uncertain results stay open for review.

## Problem and users

People save photos of posters and announcements, then return to them days or weeks later. Deadlines, venues and arrangements may have changed. Finding the official page and checking every detail takes time, especially when the notice is in another language. StillValid helps students, parents, newcomers and anyone relying on a saved public notice revisit the evidence before acting. These are intended users; adoption and user impact have not yet been measured.

## How it works and how Meta is used

Muse Spark 1.3 reads an uploaded notice into a strict JSON schema while preserving original wording. The user reviews the extracted title, issuing institution, edition and fields. StillValid can discover source candidates through Meta's Responses API with built-in web search, or fetch an official HTTPS URL supplied by the user.

Muse Spark compares the notice and retrieved text field by field with exact supporting quotes. A deterministic verifier checks quote presence, registered official-domain authority, notice identity, edition and section context. Page-level archive or withdrawal notices and incomplete or conflicting evidence prevent confirmation. The verifier supplements model interpretation; it does not establish general factual accuracy.

SAM 3.1 runs only when the user taps "Find the notice automatically": it proposes the notice area in a photo, lets the user choose among several, and can be undone; it locates areas and does not read text. Official PDF notices are compared from their own text layer; scanned PDFs are reported rather than guessed. If the notice text shows a public body's page address (for example `go.kr` or `gov`), it is offered in the editable link field with a note to check it. Reading and comparison request `minimal` reasoning effort, chosen from a small production measurement described below.

The interface and result labels support ten display languages. Switching display language preserves the original values and evidence and does not require another model call. This is display-language support, not a measured ten-language accuracy claim.

## Technical execution

The mobile web app uses Next.js and React, with server-side Meta calls and Redis-backed session results in the hosted service. Source retrieval checks public HTTPS destinations, pins public DNS answers and rechecks redirects. Results belong to an anonymous session, can be deleted, and expire after 24 hours. StillValid does not persist original image files; image processing for extraction is handled by Meta under its provider terms. Model credentials remain on the server.

Regression tests cover fabricated quotes, different institutions and editions, section mismatches, archive notices, ambiguous dates and unsupported cancellation claims. Browser fixtures exercise upload, cropping, review, result evidence, language switching and error recovery. Automated browser checks do not establish physical iPhone or Android support.

## Demonstration and limitations

The demonstration video (about three minutes, 16:9, 4K/60 fps target) has **AI-generated English narration and AI-made motion graphics** for the introduction, transitions and closing card. The product itself is shown only through **screens recorded from the live production app** in a Chromium mobile-browser viewport, not a physical-phone recording and not re-drawn. Result cards in the video are cropped from the recorded result screen without changing their text.

The example is a clearly labelled **demo card** reconstructed from a real public notice on `seoul.go.kr` (2026 Seoul Young Careers internship call, notice no. 2026-993). One value was deliberately changed on the card (the application deadline, 31 March 18:00, against 3 April 15:00 on the official page), so the recording shows a verified *changed* result with both exact quotes. That change illustrates the comparison workflow; it is not evidence that the institution moved a deadline, and the notice itself closed in April 2026. The built-in synthetic example for a different edition is shown with its "Synthetic example · No live lookup" banner and makes no model call. Earlier production checks on other notices (for example a GOV.UK notice that returned a verified match) are recorded in `docs/validation.md` and are not in the video.

The video states the build it was recorded on (`f60f6fe`); the live app has since been updated, including the model now being `muse-spark-1.3-contributor`, so screens may differ slightly. The recording session used the original `muse-spark-1.3`. [Entrant: if the video was re-recorded on a later build, replace the build and model here with the values shown in the video's caption.] The video also states that, with the contributor model, what a user submits may be used to improve Meta's models.

In the recording session, the same card and official URL produced a verified *changed* result in 2 of 3 checks; the other ended in *needs another look* because the model's identity quote did not contain the full notice title, which is the verifier working as intended. The video shows only a successful take. Reading took about 22 s and the check about 61 s in that take (both sped up in the video, with the real times captioned). Three runs are not an accuracy measurement.

Accuracy has not been measured on a human-labelled real-notice set. On 2026-11-04, two real notice photos with official links, run twice per setting in production, took a median of 45.6 s from reading to result with the model's default reasoning effort and 26.8 s with `minimal` (range 13.9–41.3 s), with the same verified outcomes. That is still above the project's own target of 15 s median and 30 s at the 90th percentile; reading a dense photo alone took about 17–25 s. Four runs per setting are not a latency guarantee or an accuracy measurement. When the official link is known, the check also starts while the user reviews the reading; in one production run (text input, 10 s review) the wait after tapping the button was 3.9 s, because the model work overlaps the review time rather than shrinking. The photo reading itself is not shortened by this. A user-reported iPhone camera flow before these changes took about three minutes and ended in review. Search without an official URL can end in review or unavailability, especially when candidates are attachments or unreadable pages. The official-host registry has limited coverage, and section/title heuristics can reject legitimate notices. If multiple programmes share an unlabelled passage, correct attribution can still depend on the model. One reported iPhone camera flow does not establish comprehensive Safari or HEIC support; Android physical-device testing remains incomplete.

## Entry links

- App: https://stillvalid-beta.vercel.app
- Repository: https://github.com/ZOOGOM/stillvalid
- Submission portal: https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit
- Demo video: add the final uploaded video URL after reviewing the cut and the form's requirements. Mention in the description that narration and motion graphics are AI-generated and that the app screens are real recordings; copy the contributor-model sentence above.

The public event page says submissions are due **4 November 2026 at 9:00 PM ET**, equivalent to **5 November at 02:00 UTC / 11:00 KST**. Aim to finish by 10:00 KST; do not rely on an unannounced grace period. Before submitting, confirm the registered individual Indie entry, final video access, repository access and deployed commit, then save the confirmation screen.
