# Real-content slice — design drafts (PROPOSALS, nothing wired into the app yet)

`real-content-schema.sql` — Supabase schema draft for task 3 of
[pinmap-team#38](https://github.com/pinmap-team/pinmap-web-prototype/issues/38):
profiles, collections, items, places (+ many-to-many `item_places`), courses.
Every table is owner-only via row level security. The app's flat `item` view
model is produced by one join at the load/save seam in `app.js`, so no screen
needs rewriting when the backend lands.

Review freely — none of this runs anywhere until the backend choice in #38 is agreed.
