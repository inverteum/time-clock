# Time Clock

A client-only HTML5/JS time clock. There is no server, no accounts, and no browser storage. Everyone and every total exist only in memory for this page load.

Use it at [inverteum.com/coding/time-clock](https://www.inverteum.com/coding/time-clock/).

## How to open

Open `index.html` in a browser, or serve the folder with any static file server, for example:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`. No build step and no dependencies are required.

## Clocking in and out

- There is no sign-up. Enter a name and clock in directly.
- The name is the identifier. There is no separate PIN, no character limit, and the name is not masked.
- Use the same name each time, including capitalization. Leading and trailing spaces are ignored, and repeated spaces are collapsed.
- Entering a new name clocks that person in. Entering a name that is already clocked in clocks them out; entering a name that is already known but currently out clocks them back in.

## In-memory warning

All clock events and totals are held only in this browser tab. Refreshing the page, closing the tab, or a browser memory-saver / tab-discard will wipe everything. Nothing is written to `localStorage`, `sessionStorage`, IndexedDB, disk, or a server. Download a CSV if you need a record before leaving.

## CSV columns

The export is one row per clock-in or clock-out event (not a summary-only file), plus a header row. If someone is still clocked in at export time, their open `clock_in` row is included and the `note` column says the clock-out is still outstanding.

| Column | Meaning |
| --- | --- |
| `name` | The name used to clock in or out |
| `event` | `clock_in` or `clock_out` |
| `timestamp_iso` | Event time as ISO 8601 with a numeric timezone offset (not a naive local timestamp) |
| `timestamp_human` | The same instant in a readable form, including the offset |
| `session_started_iso` | When this Time Clock page was first loaded (the start of the in-memory session); the same value on every row |
| `note` | Blank, or a short remark that a clock-in is still open |
