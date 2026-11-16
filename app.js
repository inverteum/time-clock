(function () {
  "use strict";

  var STORAGE_KEY = "inverteum-time-clock-v1";
  var storageAvailable = false;
  var sessionStarted = new Date();
  var people = [];
  var events = [];

  var clockForm = document.getElementById("clock-form");
  var clockName = document.getElementById("clock-name");
  var clockError = document.getElementById("clock-error");
  var statusEl = document.getElementById("status");
  var rosterEl = document.getElementById("roster");
  var rosterCount = document.getElementById("roster-count");
  var boardEl = document.getElementById("leaderboard");
  var boardCount = document.getElementById("board-count");
  var nowDisplay = document.getElementById("now-display");
  var sessionMeta = document.getElementById("session-meta");
  var exportBtn = document.getElementById("export-btn");
  var clearBtn = document.getElementById("clear-btn");
  var storageBanner = document.getElementById("storage-banner");
  var fallbackBanner = document.getElementById("fallback-banner");

  function pad(value, width) {
    var text = String(value);
    while (text.length < (width || 2)) text = "0" + text;
    return text;
  }

  function toIsoWithOffset(date) {
    var offsetMin = -date.getTimezoneOffset();
    var sign = offsetMin >= 0 ? "+" : "-";
    var abs = Math.abs(offsetMin);
    return (
      date.getFullYear() +
      "-" + pad(date.getMonth() + 1) +
      "-" + pad(date.getDate()) +
      "T" + pad(date.getHours()) +
      ":" + pad(date.getMinutes()) +
      ":" + pad(date.getSeconds()) +
      "." + pad(date.getMilliseconds(), 3) +
      sign + pad(Math.floor(abs / 60)) +
      ":" + pad(abs % 60)
    );
  }

  function toHumanTime(date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "shortOffset",
    }).format(date);
  }

  function formatDuration(ms) {
    if (ms < 0) ms = 0;
    var totalSec = Math.floor(ms / 1000);
    var hours = Math.floor(totalSec / 3600);
    var minutes = Math.floor((totalSec % 3600) / 60);
    var seconds = totalSec % 60;
    return hours + "h " + pad(minutes) + "m " + pad(seconds) + "s";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function csvField(value) {
    var text = String(value == null ? "" : value);
    if (/[",\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function normalizeName(raw) {
    return String(raw || "").trim().replace(/\s+/g, " ");
  }

  function findByName(name) {
    for (var i = 0; i < people.length; i += 1) {
      if (people[i].name === name) return people[i];
    }
    return null;
  }

  function currentTotalMs(person, now) {
    var total = person.completedMs;
    if (person.clockedInAt) {
      total += now - person.clockedInAt.getTime();
    }
    return total;
  }

  function parseDate(value) {
    if (!value) return null;
    var date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function showFallbackBanner() {
    if (storageBanner) storageBanner.hidden = true;
    if (fallbackBanner) fallbackBanner.hidden = false;
  }

  function probeStorage() {
    try {
      if (!window.localStorage) return false;
      var probeKey = STORAGE_KEY + "-probe";
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      return true;
    } catch (err) {
      return false;
    }
  }

  function applyState(data) {
    var started = parseDate(data && data.sessionStarted);
    var nextPeople = [];
    var nextEvents = [];

    if (Array.isArray(data && data.people)) {
      data.people.forEach(function (item) {
        if (!item || !item.name) return;
        nextPeople.push({
          name: String(item.name),
          completedMs: typeof item.completedMs === "number" && isFinite(item.completedMs)
            ? item.completedMs
            : 0,
          clockedInAt: parseDate(item.clockedInAt),
        });
      });
    }

    if (Array.isArray(data && data.events)) {
      data.events.forEach(function (item) {
        var timestamp = parseDate(item && item.timestamp);
        if (!item || !item.name || !timestamp) return;
        if (item.event !== "clock_in" && item.event !== "clock_out") return;
        nextEvents.push({
          name: String(item.name),
          event: item.event,
          timestamp: timestamp,
        });
      });
    }

    sessionStarted = started || new Date();
    people = nextPeople;
    events = nextEvents;
  }

  function serializeState() {
    return JSON.stringify({
      sessionStarted: toIsoWithOffset(sessionStarted),
      people: people.map(function (person) {
        return {
          name: person.name,
          completedMs: person.completedMs,
          clockedInAt: person.clockedInAt ? toIsoWithOffset(person.clockedInAt) : null,
        };
      }),
      events: events.map(function (record) {
        return {
          name: record.name,
          event: record.event,
          timestamp: toIsoWithOffset(record.timestamp),
        };
      }),
    });
  }

  function saveState() {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeState());
    } catch (err) {
      storageAvailable = false;
      showFallbackBanner();
    }
  }

  function loadState() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      storageAvailable = false;
      showFallbackBanner();
      return;
    }
    if (!raw) return;
    try {
      applyState(JSON.parse(raw));
    } catch (err) {
      people = [];
      events = [];
      sessionStarted = new Date();
    }
  }

  function setError(el, message) {
    if (message) {
      el.hidden = false;
      el.textContent = message;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function setStatus(message, kind) {
    if (!message) {
      statusEl.innerHTML = "";
      return;
    }
    statusEl.innerHTML =
      '<p class="status-msg ' + (kind || "info") + '">' + escapeHtml(message) + "</p>";
  }

  function render(now) {
    now = now || new Date();
    nowDisplay.textContent = toHumanTime(now);
    sessionMeta.textContent =
      "Records in this browser first started saving " + toHumanTime(sessionStarted) + ".";

    var clockedIn = people
      .filter(function (person) { return person.clockedInAt; })
      .sort(function (a, b) { return a.clockedInAt - b.clockedInAt; });

    rosterCount.textContent = clockedIn.length === 1
      ? "1 person"
      : clockedIn.length + " people";

    if (clockedIn.length === 0) {
      rosterEl.innerHTML = '<p class="empty">No one is clocked in.</p>';
    } else {
      rosterEl.innerHTML = clockedIn.map(function (person) {
        var elapsed = formatDuration(now - person.clockedInAt.getTime());
        var since = toHumanTime(person.clockedInAt);
        return (
          '<article class="row">' +
            '<div>' +
              '<p class="row-name">' + escapeHtml(person.name) +
                '<span class="badge live">In</span></p>' +
              '<p class="row-meta">Clocked in ' + escapeHtml(since) + '</p>' +
            '</div>' +
            '<p class="row-time">' + elapsed + '</p>' +
          '</article>'
        );
      }).join("");
    }

    var ranked = people
      .map(function (person) {
        return { person: person, total: currentTotalMs(person, now) };
      })
      .filter(function (entry) {
        return entry.total > 0 || entry.person.clockedInAt;
      })
      .sort(function (a, b) {
        if (b.total !== a.total) return b.total - a.total;
        return a.person.name.localeCompare(b.person.name);
      });

    boardCount.textContent = ranked.length === 1
      ? "1 person"
      : ranked.length + " people";

    if (ranked.length === 0) {
      boardEl.innerHTML = '<p class="empty">No time recorded yet.</p>';
    } else {
      boardEl.innerHTML = ranked.map(function (entry, index) {
        var badge = entry.person.clockedInAt
          ? '<span class="badge live">In</span>'
          : "";
        return (
          '<article class="row">' +
            '<div>' +
              '<p class="row-name"><span class="rank">' + (index + 1) + '.</span> ' +
                escapeHtml(entry.person.name) + badge + '</p>' +
            '</div>' +
            '<p class="row-time">' + formatDuration(entry.total) + '</p>' +
          '</article>'
        );
      }).join("");
    }
  }

  function onClock(event) {
    event.preventDefault();
    setError(clockError, "");

    var name = normalizeName(clockName.value);
    if (!name) {
      setError(clockError, "Enter your name.");
      clockName.focus();
      return;
    }

    var person = findByName(name);
    if (!person) {
      person = {
        name: name,
        completedMs: 0,
        clockedInAt: null,
      };
      people.push(person);
    }

    var now = new Date();
    if (person.clockedInAt) {
      var elapsed = now - person.clockedInAt.getTime();
      person.completedMs += elapsed;
      events.push({
        name: person.name,
        event: "clock_out",
        timestamp: now,
      });
      var started = person.clockedInAt;
      person.clockedInAt = null;
      setStatus(
        person.name + " clocked out after " + formatDuration(elapsed) +
          " (in since " + toHumanTime(started) + ").",
        "ok"
      );
    } else {
      person.clockedInAt = now;
      events.push({
        name: person.name,
        event: "clock_in",
        timestamp: now,
      });
      setStatus(person.name + " is now clocked in.", "ok");
    }

    clockForm.reset();
    clockName.focus();
    render(now);
    saveState();
  }

  function stillClockedIn(name, eventTime) {
    for (var i = 0; i < people.length; i += 1) {
      var person = people[i];
      if (
        person.name === name &&
        person.clockedInAt &&
        person.clockedInAt.getTime() === eventTime.getTime()
      ) {
        return true;
      }
    }
    return false;
  }

  function exportCsv() {
    var sessionIso = toIsoWithOffset(sessionStarted);
    var header = [
      "name",
      "event",
      "timestamp_iso",
      "timestamp_human",
      "session_started_iso",
      "note",
    ];
    var lines = [header.join(",")];

    events.forEach(function (record) {
      var note = "";
      if (
        record.event === "clock_in" &&
        stillClockedIn(record.name, record.timestamp)
      ) {
        note = "open; clock-out is still outstanding as of export";
      }
      lines.push([
        csvField(record.name),
        csvField(record.event),
        csvField(toIsoWithOffset(record.timestamp)),
        csvField(toHumanTime(record.timestamp)),
        csvField(sessionIso),
        csvField(note),
      ].join(","));
    });

    if (events.length === 0) {
      setStatus("There are no clock-in or clock-out events to export yet.", "info");
      return;
    }

    var blob = new Blob(["\uFEFF" + lines.join("\r\n") + "\r\n"], {
      type: "text/csv;charset=utf-8",
    });
    var stamp = toIsoWithOffset(new Date()).replace(/[:.]/g, "-");
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "time-clock-" + stamp + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setStatus("CSV downloaded with " + events.length + " event row" + (events.length === 1 ? "" : "s") + ".", "ok");
  }

  function clearRecords() {
    if (!window.confirm("This will erase all saved clock records in this browser. Continue?")) {
      return;
    }
    people = [];
    events = [];
    sessionStarted = new Date();
    saveState();
    setStatus("All saved clock records in this browser were erased.", "ok");
    render();
  }

  function onStorage(event) {
    if (event.key !== STORAGE_KEY) return;
    if (event.newValue == null) {
      people = [];
      events = [];
      sessionStarted = new Date();
      render();
      return;
    }
    try {
      applyState(JSON.parse(event.newValue));
      render();
    } catch (err) {
      // Ignore a bad payload written in another tab.
    }
  }

  storageAvailable = probeStorage();
  if (storageAvailable) {
    loadState();
  } else {
    showFallbackBanner();
  }

  clockForm.addEventListener("submit", onClock);
  exportBtn.addEventListener("click", exportCsv);
  clearBtn.addEventListener("click", clearRecords);
  window.addEventListener("storage", onStorage);

  render();
  window.setInterval(function () { render(); }, 1000);
})();
