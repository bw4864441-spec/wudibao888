# L-Design-icon Design

## Goal

Build a responsive icon browsing platform inspired by the supplied Ricon screenshot. Users land directly in an immersive icon canvas and can search, filter, preview, and download individual icons or the visible set.

## Visual Direction

- Independent `L-Design-icon` identity; do not reuse Ricon branding or copy.
- White full-viewport canvas with softly lit, toy-like 3D icon assets.
- Compact floating header: brand at left, category/search capsule centered, utility controls at right.
- Organic scattered layout on desktop, dense grid option, and a stable responsive grid on mobile.
- Coral-red primary accent, charcoal text, soft neutral shadows, no gradients or decorative background shapes.

## Core Experience

- Search by icon name or category.
- Filter by All, Food, Animals, Tech, Objects, and Travel.
- Toggle scatter and grid views.
- Open an icon preview with its name, category, and download action.
- Download one icon or all currently visible icons.
- Toggle interface labels between English and Chinese.

## Architecture

- React + TypeScript + Vite.
- Icon catalog and pure filtering/layout helpers are separate from UI components.
- PNG assets are bundled locally; UI controls use an installed icon library.
- Browser-only downloads; no account system, backend, or persistence in this prototype.

## Responsive Behavior

- Desktop uses the screenshot's floating chrome and broad three-row canvas.
- Tablet keeps the floating header but reduces scatter density.
- Mobile uses a fixed brand/utility row, horizontally scrollable categories, two-column icon grid, and a full-width bottom download action.

## Quality Gates

- Unit tests cover filtering and deterministic scatter positions.
- Production build and Sites compatibility checks pass.
- Desktop and mobile screenshots are compared against the supplied reference for hierarchy, density, spacing, and control placement.
