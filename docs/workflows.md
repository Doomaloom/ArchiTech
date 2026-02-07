# Workflows Guide

## Overview
ArchiTech supports two primary workflows for turning ideas into editable web output. Both workflows share the same base layout, styling, and sidebar rail presentation. The sidebar rail changes its button set based on the active project type.

## Shared UI and Layout
- Base layout: existing sidebar rail + top bar layout is shared across workflows.
- Visual language: shared typography, spacing, and component styling across both workflows.
- Sidebar rail: button set switches based on project type only.

## Project Types
Each project has a defined type selected at project creation on the home page. The project type determines the active workflow and its sidebar rail configuration.

Project types:
- `image-to-site`
- `inspire`

## Sidebar Rail Mapping
| Workflow | Sidebar buttons (top to bottom) |
| --- | --- |
| Image-to-Site | Home, Image upload and description, Website structure, Preview, Iteration, Code editor, Settings |
| Inspire | Home, Project description, Style, Inspire workspace, Previews, Iteration, Code editor, Settings |

## Workflow 1: Image-to-Site
Purpose: Convert a provided image and description into a structured site, preview it, and iterate on the generated HTML.

Steps:
1. Image upload and description
   - User provides source images and a brief describing the desired site.
2. Website structure
   - AI generates a page and section tree based on the description and images.
3. Preview
   - Generate visual previews to review style and layout quickly.
4. Iteration
   - Enter iterative view with tools for selecting, annotating, and editing.
5. Code editor
   - Edit the generated HTML directly.

Notes:
- This workflow is mostly implemented and serves as the baseline for shared UX.
- Use existing structure and preview APIs as the primary integration points.

## Workflow 2: Inspire
Purpose: Start from inspiration and curated styles, generate previews fast, then iterate into editable HTML.

High-level sequence:
1. Project description
   - User describes the app look and functionality.
2. Style (Tab 1)
   - AI suggests style ideas: color palettes, shapes, and component design.
3. Inspire (Tab 2)
   - Curated inspiration page with premade styles.
   - User selects a style from either AI suggestions or presets.
4. Project tree
   - AI proposes a project tree or folder structure based on the selected style and project description.
5. Previews
   - Generate preview images to reduce time and cost.
6. Inspire workspace
   - Previews include an edit brush and a comment box to describe changes.
7. Iteration
   - Once approved, generate HTML and open in the iterative editor.
8. Code editor
   - Final HTML editing.

Notes:
- Inspire shares the same iterative and code editing surfaces as Image-to-Site.
- The main difference is the styling and inspiration flow prior to preview generation.

## Integration Notes
- Project creation on the home page must capture project type and persist it.
- The sidebar rail should render its button set based on the active project type.
- Shared components should be reused where possible (iteration tools, code editor, preview grid).
- Inspire should reuse existing preview and structure endpoints where applicable, with Inspire-specific prompt tuning.
- Handoff from Inspire previews to the iterative view must preserve selected style, comments, and any edits made via brush or annotations.

## Open Decisions
- Data model for project type and where it is stored (local state vs. persistence).
- UI details for the Inspire workspace editing tools (brush size, annotation styles).
