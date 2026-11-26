
const loginPanel = document.getElementById("loginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");

const eventModal = new bootstrap.Modal(
    document.getElementById("eventModal")
);

let cachedEvents = [];
let cachedRegistrations = [];

let selectedSource = "All";

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

async function checkSession() {
    try {
        const state = await api("/api/admin/me");

        if (state.authenticated) {
            showDashboard();
        }
    } catch (error) {
        console.error(error);
    }
}

function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;

    refreshDashboard();
}

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    loginFeedback.textContent = "Checking credentials...";

    try {
        await api("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({
                username: document.getElementById("username").value,
                password: document.getElementById("password").value
            })
        });

        loginFeedback.textContent = "";

        showDashboard();

    } catch (error) {
        loginFeedback.textContent = error.message;
    }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
    try {
        await api("/api/admin/logout", {
            method: "POST"
        });

        dashboardPanel.hidden = true;
        loginPanel.hidden = false;

        loginForm.reset();

    } catch (error) {
        alert(error.message);
    }
});

async function refreshDashboard() {
    try {
        const [overview, events, registrations] = await Promise.all([
            api("/api/admin/overview"),
            api("/api/admin/events"),
            api("/api/admin/registrations")
        ]);

        cachedEvents = events;
        cachedRegistrations = registrations;

        document.getElementById("totalRegistrations").textContent =
            overview.totalRegistrations;

        document.getElementById("totalEvents").textContent =
            overview.totalEvents;

        renderEvents();
        renderRegistrations();

    } catch (error) {
        alert(error.message);
    }
}

function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

function renderEvents() {
    const tbody = document.getElementById("eventsTable");

    tbody.innerHTML = cachedEvents.map(event => `
        <tr>
            <td>
                <strong>${safe(event.title)}</strong>
                <small>${safe(event.id)}</small>
            </td>

            <td>${safe(event.category)}</td>

            <td>
                <span class="status-pill">
                    ${safe(event.status)}
                </span>
            </td>

            <td>
                <button
                    class="btn btn-sm btn-outline-light me-1"
                    data-edit="${safe(event.id)}"
                >
                    EDIT
                </button>

                <button
                    class="btn btn-sm btn-outline-danger"
                    data-delete="${safe(event.id)}"
                >
                    DELETE
                </button>
            </td>
        </tr>
    `).join("") || `
        <tr>
            <td colspan="4">No case files.</td>
        </tr>
    `;

    tbody.querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => {
            editEvent(button.dataset.edit);
        });
    });

    tbody.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => {
            deleteEvent(button.dataset.delete);
        });
    });
}

function renderRegistrations() {
    const tbody = document.getElementById("registrationsTable");

    const filteredRegistrations = cachedRegistrations.filter(registration => {
        return selectedSource === "All" ||
            registration.source === selectedSource;
    });

    tbody.innerHTML = filteredRegistrations.map(registration => {
        const isWebsite = registration.source === "Website";

        const sourceBadge = isWebsite
            ? '<span class="status-pill">Website</span>'
            : '<span class="status-pill">Google Form</span>';

        const statusControl = isWebsite
            ? `
                <select
                    class="form-select form-select-sm status-select"
                    data-status="${safe(registration.id)}"
                >
                    <option ${registration.status === "Received" ? "selected" : ""}>Received</option>
                    <option ${registration.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                    <option ${registration.status === "Waitlisted" ? "selected" : ""}>Waitlisted</option>
                    <option ${registration.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
            `
            : `
                <small>Managed in Google Form</small>
            `;

        return `
            <tr>
                <td>
                    <strong>${safe(registration.id)}</strong>
                    <small>${safe(registration.createdAt)}</small>
                </td>

                <td>
                    ${safe(registration.fullName)}
                    <small>${safe(registration.college)}</small>
                </td>

                <td>${safe(registration.eventTitle)}</td>

                <td>
                    ${safe(registration.email)}
                    <small>${safe(registration.phone)}</small>
                </td>

                <td>${sourceBadge}</td>

                <td>
                    <span class="status-pill">
                        ${safe(registration.status)}
                    </span>
                </td>

                <td>${statusControl}</td>
            </tr>
        `;
    }).join("") || `
        <tr>
            <td colspan="7">No registrations received yet.</td>
        </tr>
    `;

    tbody.querySelectorAll("[data-status]").forEach(select => {
        select.addEventListener("change", async () => {
            try {
                await api(
                    `/api/admin/registrations/${select.dataset.status}`,
                    {
                        method: "PATCH",
                        body: JSON.stringify({
                            status: select.value
                        })
                    }
                );

                await refreshDashboard();

            } catch (error) {
                alert(error.message);
            }
        });
    });
}

document.getElementById("sourceFilter").addEventListener("change", event => {
    selectedSource = event.target.value;
    renderRegistrations();
});

document.getElementById("refreshRegistrations").addEventListener("click", () => {
    refreshDashboard();
});

function editEvent(id) {
    const item = cachedEvents.find(event => event.id === id);

    if (!item) return;

    document.getElementById("editEventId").value = item.id;
    document.getElementById("eventTitle").value = item.title;
    document.getElementById("eventCategory").value = item.category;
    document.getElementById("eventDescription").value = item.description;
    document.getElementById("eventVenue").value = item.venue;
    document.getElementById("eventTime").value = item.time;
    document.getElementById("eventPrize").value = item.prize || "";
    document.getElementById("eventStatus").value = item.status;

    eventModal.show();
}

document.getElementById("addEventButton").addEventListener("click", () => {
    document.getElementById("eventForm").reset();

    document.getElementById("editEventId").value = "";

    eventModal.show();
});

document.getElementById("eventForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("editEventId").value;

    const payload = {
        title: document.getElementById("eventTitle").value,
        category: document.getElementById("eventCategory").value,
        description: document.getElementById("eventDescription").value,
        venue: document.getElementById("eventVenue").value,
        time: document.getElementById("eventTime").value,
        prize: document.getElementById("eventPrize").value,
        status: document.getElementById("eventStatus").value
    };

    try {
        await api(
            id ? `/api/admin/events/${id}` : "/api/admin/events",
            {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(payload)
            }
        );

        eventModal.hide();

        refreshDashboard();

    } catch (error) {
        alert(error.message);
    }
});

async function deleteEvent(id) {
    if (!confirm("Delete this case file? Existing registrations will remain in the records.")) {
        return;
    }

    try {
        await api(`/api/admin/events/${id}`, {
            method: "DELETE"
        });

        refreshDashboard();

    } catch (error) {
        alert(error.message);
    }
}

document.getElementById("exportButton").addEventListener("click", () => {
    const headers = [
        "Reference",
        "Name",
        "Email",
        "Phone",
        "College",
        "Event",
        "Team",
        "Status",
        "Source",
        "Created"
    ];

    const rows = cachedRegistrations
        .filter(registration => {
            return selectedSource === "All" ||
                registration.source === selectedSource;
        })
        .map(registration => [
            registration.id,
            registration.fullName,
            registration.email,
            registration.phone,
            registration.college,
            registration.eventTitle,
            registration.teamName,
            registration.status,
            registration.source,
            registration.createdAt
        ]);

    const csv = [headers, ...rows]
        .map(row => row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(","))
        .join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "crime-files-registrations.csv";

    link.click();

    URL.revokeObjectURL(url);
});

checkSession();
