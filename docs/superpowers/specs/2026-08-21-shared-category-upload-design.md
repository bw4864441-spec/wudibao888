# Shared Category Upload Design

## Goal

Fix the deployed L-Design logo path and let an authorized administrator upload multiple image icons to the currently selected business category. Uploaded icons must become visible to every visitor after GitHub Pages publishes the resulting commit.

## Scope

- Use `import.meta.env.BASE_URL` for the Logo image so it works both at `/` locally and under `/wudibao888/` on GitHub Pages.
- Show an upload control only when a specific category is selected. The `All` category has no upload target and does not show the control.
- Open a modal that accepts multiple PNG, JPEG, and WebP files, displays image previews, and allows each filename-derived icon name to be edited.
- Require a GitHub Fine-grained Personal Access Token scoped to repository contents read/write for `bw4864441-spec/wudibao888`.
- Keep the token in React state only. Do not write it to localStorage, sessionStorage, query strings, logs, or the repository.
- Submit all images and catalog changes using the Git Data API as one commit to `main`. The commit adds images under `public/assets/user-icons/` and updates one public catalog file.
- GitHub Pages publishes the commit, making the new entries visible to every visitor.

## UI

- An upload icon button is placed in the utility controls with an accessible label. It is displayed for any category except `All`.
- The modal identifies the active category and includes a multi-file picker, image preview list, editable names, and a token field.
- The primary action is disabled until there is at least one valid image and a token is present.
- While submitting, the action is busy and cannot be clicked again. On success, show a confirmation that publishing is in progress and close the modal. On failure, keep the modal open and show the error.

## Data Flow

1. The app fetches `catalog.json` under the Vite base path and merges its shared entries with the built-in icons.
2. The administrator selects a category, chooses image files, and enters a temporary token.
3. The browser optimizes each image to PNG with a maximum edge of 720px, converts it to base64, and assigns each icon a unique ID.
4. The Git Data API reads `main`, creates blobs for the image files and replacement catalog, creates a tree and commit, then updates `main` once.
5. The push triggers the existing GitHub Pages workflow. Visitors receive the new catalog and images when the Pages deployment completes.

## Error Handling

- Invalid image files are rejected before submission and remain identified in the modal.
- Token, permission, repository, or branch errors are rendered as a readable message without exposing token content.
- A failed API request updates no local shared catalog state. The user can correct the token or list and retry.
- Existing local delete and replacement preferences continue to apply after shared icons load.

## Tests

- Verify base-path helper produces the GitHub Pages logo URL.
- Verify shared catalog entries are merged and still filter by category.
- Verify upload preparation rejects unsupported files and derives a unique ID and category for valid files.
- Verify the Git commit payload includes each image plus the updated catalog in one tree.
