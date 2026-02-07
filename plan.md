# Ideogram Preview + Mask Edit + Gemini Finalize (Inspire Flow)

## Goal
Update only the Inspire workflow so previews are generated as Ideogram images (transparent), allow mask-based edits via Ideogram, and only after user confirmation generate final HTML with Gemini.

## Scope
- Only Inspire flow (`/api/inspire/*` and Inspire UI/hooks).
- Do NOT change the non-Inspire `/api/previews` or image-to-site flow.

---

## Step 1 — Replace Inspire previews with Ideogram image generation
**Files:** `app/api/inspire/previews/route.js`

**Actions:**
- Remove/disable HTML generation and Puppeteer rendering for Inspire previews.
- Add Ideogram prompt builder (copy/adapt from `app/api/previews/route.js`):
  - Should include: plan + brief + style + nodeContext + workspace note/mask bounds.
- Call `POST https://api.ideogram.ai/v1/ideogram-v3/generate-transparent`.
- Download returned URL immediately.
- Return image as base64 data URL: `data:image/png;base64,...`
- Response `previews[]` should include:
  - `id`, `plan`, `imageUrl`, `model`, `temperature`, optional errors.

**Notes:**
- Use `IDEOGRAM_API_KEY` env var.
- Preserve preview count, temperature/creativity logic.

---

## Step 2 — Add Ideogram edit endpoint for mask updates
**Files:** `app/api/inspire/edits/route.js` (new)

**Inputs (JSON or multipart):**
- `imageDataUrl` (base64)
- `maskDataUrl` (base64)
- `prompt` (workspace note + plan/style context)
- Optional: `plan`, `brief`, `style`, `nodeContext`

**Actions:**
- Convert data URLs to binary buffers.
- Ensure mask size matches image size:
  - If mismatch: scale mask to image dimensions server-side.
- Call `POST https://api.ideogram.ai/v1/ideogram-v3/edit` with:
  - `image`, `mask`, `prompt`, optional params.
- Download edited result and return base64 data URL.

**Output:**
- `{ imageUrl }` (data URL) + optional metadata.

---

## Step 3 — Add Gemini finalize endpoint (HTML generation)
**Files:** `app/api/inspire/finalize/route.js` (new)

**Inputs:**
- `imageDataUrl` (final preview)
- Optional: `plan`, `brief`, `style`, `nodeContext`

**Actions:**
- Send image + prompt to Gemini (like structure route does for images).
- Ask for **complete HTML document only**, no markdown.
- Return `{ html }`.

---

## Step 4 — Wire Inspire state actions
**Files:** `app/_hooks/use-inspire-state.js`

**Actions:**
- Update `generatePreviews` to expect `imageUrl` only (no html).
- Add `applyMaskEdit`:
  - Requires `workspaceMask.dataUrl` + selected preview image.
  - Calls `/api/inspire/edits` and updates selected preview’s `imageUrl`.
- Add `finalizeToHtml`:
  - Calls `/api/inspire/finalize` with selected preview image.
  - Stores returned HTML on the selected preview.

---

## Step 5 — Update Inspire UI
**Files:** `app/_components/InspireView.js`

**Workspace step UI updates:**
- Add “Apply mask edit” button:
  - Disabled if no mask or no preview image.
- Add “Finalize → Generate HTML” button:
  - Disabled if no preview image.
- Once HTML exists, allow “Continue to iteration” (existing flow).

**Preview cards:**
- Continue to show image thumbnails (no HTML iframe until finalization).

---

## Step 6 — Error handling & UX
- Handle Ideogram errors (422/429).
- Keep existing `previewError` and `renderError` handling.
- Display clear error messages in preview grid/workspace.

---

## Env Vars
- `IDEOGRAM_API_KEY` (required for generate + edit).
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` for finalize endpoint.

---

## Non-goals
- No changes to `/api/previews` or image-to-site workflow.
- No changes to Inspire structure/style generation.

---

## Test Checklist
- Generate previews (Ideogram images show).
- Apply mask edit (image updates).
- Finalize to HTML (HTML available in iteration view).
- Confirm iteration tools work with generated HTML.
