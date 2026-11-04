# StillValid submission copy

Prepared for the **Indie developer track, individual entrant**, under **Build for Your World**. The entrant confirmed the track. Submission is to be completed later by the entrant; this file does not establish a submitted entry. The authenticated form's field names, character limits and video requirements still need checking.

## Project name and tagline

**StillValid — Saved a notice. Still the same?**

## Short description

StillValid helps people revisit a saved notice before acting. Meta SAM 3.1 can suggest which notice to crop from a photo; Muse Spark 1.3 reads it, discovers source candidates or compares a supplied official link, and proposes field comparisons with exact quotes. Deterministic evidence checks decide what can be confirmed. Uncertain results stay open for review, with source-specific explanations.

## Problem and users

People save photos of posters and announcements, then return to them days or weeks later. Deadlines, venues and arrangements may have changed. Finding the official page and checking every detail takes time, especially when the notice is in another language. StillValid helps students, parents, newcomers and anyone relying on a saved public notice revisit the evidence before acting. These are intended users; adoption and user impact have not yet been measured.

## How it works and how Meta is used

The user can crop manually or explicitly ask SAM 3.1 to find the notice. A single qualifying area is cropped with an undo option; several areas are numbered for the user to choose. The default concept is `document`, with one `poster` fallback when no area is found. A dense board can still be returned as one large area and require manual cropping. No locate call runs until the user chooses it.

Muse Spark 1.3 reads the selected notice into a strict JSON schema while preserving original wording. The user reviews the extracted title, issuing institution, edition and fields. Small photos receive a quality hint, and readings the model marks uncertain receive a review warning. HEIC/HEIF is re-encoded to JPEG where the browser can decode it; otherwise the app explains how to provide a supported image. Physical iPhone HEIC decoding remains unverified.

StillValid can discover source candidates through Meta's Responses API with built-in web search, or fetch a public HTTPS URL supplied by the user. Providing a URL skips the search call. Retrieval supports HTML, plain text and bounded PDF text layers, including named PDF downloads served as generic binary data when the file signature is valid. Scanned PDFs without a text layer are not read. PDF metadata titles are not identity evidence.

Muse Spark compares the notice and retrieved text field by field with exact supporting quotes. A deterministic verifier checks quote presence, registered official-domain authority, notice identity, edition and section context. The registry includes Korean government `go.kr` hosts, with explicit exclusions for recognised public-board, Q&A, petition and similar user-content paths. A registered host alone does not establish that a page is the current notice. Page-level archive or withdrawal notices and incomplete or conflicting evidence prevent confirmation. Differences in date or place wording can remain unverified, even on an official page. The verifier supplements model interpretation; it does not establish general factual accuracy.

Results explain what happened to each source candidate and expose measured processing stages. Place values can open a Google Maps search using their original wording. The link does not verify the place, request the user's location or trigger a new model check; whether the app or web map opens depends on the device.

The interface and result labels support ten display languages. Switching display language preserves the original values and evidence and does not require another model call. This is display-language support, not a measured ten-language accuracy claim.

## Technical execution

The mobile web app uses Next.js and React, with server-side Meta calls and Redis-backed session results in the hosted service. Source retrieval checks public HTTPS destinations, pins public DNS answers and rechecks redirects. Results belong to an anonymous session, can be deleted, and expire after 24 hours. StillValid does not persist original image files; image processing for extraction is handled by Meta under its provider terms. Model credentials remain on the server.

Regression tests cover fabricated quotes, different institutions and editions, section mismatches, archive notices, ambiguous dates and unsupported cancellation claims. Browser fixtures exercise upload, cropping, review, result evidence, language switching and error recovery. Automated browser checks do not establish physical iPhone or Android support.

## Demonstration and limitations

The refreshed silent demonstration uses actual production screen captures from `ae54a88` and explanatory slides. SAM offered four notices on a clearly labelled synthetic board, and a separate reconstructed Seoul card returned a verified deadline change. Its earlier date is artificial, not evidence of a historical deadline extension. A reconstructed Miryang text input reached an `unavailable` result after source retrieval failed; that failure is shown rather than replaced with an earlier success. The map-search UI segment uses an explicitly labelled local HTTP fixture, not a live Miryang result or a phone map-app hand-off. The cut omits waiting and is not a continuous recording or physical-phone video. PDF support and earlier public-photo tests are described as earlier recorded evidence, not newly demonstrated requests. Review the final cut and dated validation before uploading. Built-in synthetic examples are separate and make no live lookup.

Earlier recorded SAM tests used two rendered inputs and Creative Commons-licensed public Flickr photographs found through Openverse, for testing only. The photographs are not stored in this repository. Several notices on a framed board were offered for selection, while a dense school board was not separated into individual sheets. An uncertain partial reading of a small notice is a recorded limitation, not proof of reliable OCR in poor conditions. See the dated observations in [validation](validation.md).

Accuracy has not been measured on a human-labelled real-notice set. Earlier controlled production observations took roughly 45–90 seconds from image extraction to a result; a user-reported iPhone camera flow took about three minutes and ended in review. These are observations, not a latency guarantee. Search without an official URL can end in review or unavailability, especially when candidates are blocked, scanned PDFs, unsupported attachments or unreadable pages. Source coverage is limited, and section/title heuristics can reject legitimate notices. If multiple programmes share an unlabelled passage, correct attribution can still depend on the model. One reported iPhone camera flow predates the newer features and does not establish current Safari, SAM, HEIC or map-app hand-off support; Android physical-device testing remains incomplete.

## Entry links

- App: https://stillvalid-beta.vercel.app
- Repository: https://github.com/ZOOGOM/stillvalid
- Submission portal: https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit
- Demo video: add the final uploaded video URL after reviewing the cut and the form's requirements.

The public event page says submissions are due **4 November 2026 at 9:00 PM ET**, equivalent to **5 November at 02:00 UTC / 11:00 KST**. Aim to finish by 10:00 KST; do not rely on an unannounced grace period. Before submitting, confirm the registered individual Indie entry, final video access, repository access and deployed commit, then save the confirmation screen.
