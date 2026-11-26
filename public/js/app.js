const eventGrid = document.getElementById("eventGrid");
const eventSelect = document.getElementById("eventId");
const form = document.getElementById("registrationForm");
const feedback = document.getElementById("formFeedback");

async function loadEvents() {
  try {
    const response = await fetch("/api/events");
    const events = await response.json();
    eventGrid.innerHTML = "";
    eventSelect.innerHTML = '<option value="">Choose an event</option>';
    if (!events.length) eventGrid.innerHTML = '<div class="col-12 muted-copy">No case files have been released yet.</div>';
    events.forEach((event, index) => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-xl-3";
      const card = document.createElement("article");
      card.className = "case-card";
      const number = String(index + 1).padStart(2, "0");
      card.innerHTML = `<div class="case-card-top"><span>CASE / ${number}</span><span class="case-status ${event.status === "Open" ? "is-open" : ""}">${escapeHtml(event.status)}</span></div><div class="case-art"><span class="case-watermark">CF</span><span class="case-symbol">${["⌕", "◉", "⌁", "✳"][index % 4]}</span><span class="case-art-label">EVIDENCE LOG ${number}</span></div><div class="case-card-content"><span class="case-category">${escapeHtml(event.category)}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><div class="case-meta"><span>⌖ ${escapeHtml(event.venue || "To be announced")}</span><span>◷ ${escapeHtml(event.time || "To be announced")}</span></div>${event.prize ? `<div class="case-prize"><span>PRIZE</span><strong>${escapeHtml(event.prize)}</strong></div>` : ""}<button class="case-link" ${event.status !== "Open" ? "disabled" : ""} data-event="${escapeHtml(event.id)}">${event.status === "Open" ? "ENTER THIS CASE ↗" : "CASE CLOSED"}</button></div>`;
      col.appendChild(card);
      eventGrid.appendChild(col);
      if (event.status === "Open") {
        const option = document.createElement("option");
        option.value = event.id;
        option.textContent = `${event.title} — ${event.category}`;
        eventSelect.appendChild(option);
      }
    });
    
    document.querySelectorAll(".case-link:not(:disabled)").forEach(button => button.addEventListener("click", () => {
      eventSelect.value = button.dataset.event;
      document.getElementById("register").scrollIntoView({ behavior: "smooth" });
    }));
  } catch {
    eventGrid.innerHTML = '<div class="col-12 muted-copy">Unable to load case files. Please refresh the page.</div>';
  }
}

// CRIME FILES COUNTDOWN

document.addEventListener("DOMContentLoaded", function () {

  const eventDate = new Date("2026-12-02T10:00:00+05:30").getTime();

  const daysElement = document.getElementById("timerDays");
  const hoursElement = document.getElementById("timerHours");
  const minutesElement = document.getElementById("timerMinutes");
  const secondsElement = document.getElementById("timerSeconds");

  const timerElement = document.getElementById("countdownTimer");
  const messageElement = document.getElementById("countdownMessage");
  const headingElement = document.querySelector(".countdown-heading");

  if (
    !daysElement ||
    !hoursElement ||
    !minutesElement ||
    !secondsElement ||
    !timerElement ||
    !messageElement ||
    !headingElement
  ) return;

  function updateCountdown() {

    const now = Date.now();
    const difference = eventDate - now;

    if (difference <= 0) {

      timerElement.style.display = "none";

      headingElement.innerHTML = `
        <span class="countdown-live-dot"></span>
        <span>INVESTIGATION STATUS</span>
        <span class="countdown-case">LIVE</span>
      `;

      messageElement.textContent = "THE INVESTIGATION IS NOW LIVE";
      return;
    }

    const days = Math.floor(difference / 86400000);
    const hours = Math.floor((difference % 86400000) / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    daysElement.textContent = String(days).padStart(2, "0");
    hoursElement.textContent = String(hours).padStart(2, "0");
    minutesElement.textContent = String(minutes).padStart(2, "0");
    secondsElement.textContent = String(seconds).padStart(2, "0");

  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  feedback.textContent = "Submitting your file...";
  feedback.className = "form-feedback";
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Registration failed.");
    feedback.textContent = result.message;
    feedback.className = "form-feedback success";
    form.reset();
  } catch (error) {
    feedback.textContent = error.message;
    feedback.className = "form-feedback error";
  }
});
loadEvents();