# Time Clock

A client-only HTML5/JS time clock. There is no server and no accounts. The name is the identifier. Records are saved in this browser.

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

## Saved records

Records are saved in this browser. Nothing is sent to a server. Another browser, a private window, or clearing site data starts empty.

Clock events and totals survive a refresh, a closed tab, and a browser memory-saver. A person who was clocked in stays clocked in after reload, and time keeps accumulating from the original clock-in time. Open tabs stay in sync with each other.

Use **Clear saved records** to erase everyone, every event, and the session start time stored in this browser.

If the browser cannot use `localStorage`, the page shows a fallback banner and keeps data in memory for that tab only.

## CSV columns

The export is one row per clock-in or clock-out event (not a summary-only file), plus a header row. If someone is still clocked in at export time, their open `clock_in` row is included and the `note` column says the clock-out is still outstanding.

| Column | Meaning |
| --- | --- |
| `name` | The name used to clock in or out |
| `event` | `clock_in` or `clock_out` |
| `timestamp_iso` | Event time as ISO 8601 with a numeric timezone offset (not a naive local timestamp) |
| `timestamp_human` | The same instant in a readable form, including the offset |
| `session_started_iso` | When records first started saving in this browser; the same value on every row |
| `note` | Blank, or a short remark that a clock-in is still open |
