
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const { appendRegistration } = require("./googleSheets");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const REG_FILE = path.join(DATA_DIR, "registrations.json");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(REG_FILE)) {
    fs.writeFileSync(REG_FILE, "[]");
}

if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(
        EVENTS_FILE,
        JSON.stringify([
            {
                id: "case-001",
                title: "The Final Cipher",
                category: "Technical",
                description: "Crack the code, connect the clues and solve the digital mystery.",
                venue: "To be announced",
                time: "To be announced",
                status: "Open"
            },
            {
                id: "case-002",
                title: "Murder at Midnight",
                category: "Mystery",
                description: "Follow the evidence and identify the truth behind the case.",
                venue: "To be announced",
                time: "To be announced",
                status: "Open"
            },
            {
                id: "case-003",
                title: "Digital Footprints",
                category: "Cyber",
                description: "Investigate a simulated digital trail and uncover what happened.",
                venue: "To be announced",
                time: "To be announced",
                status: "Open"
            },
            {
                id: "case-004",
                title: "The Witness Room",
                category: "Fun",
                description: "Listen closely, examine the details and separate fact from fiction.",
                venue: "To be announced",
                time: "To be announced",
                status: "Open"
            }
        ], null, 2)
    );
}

const readJson = (file) => {
    return JSON.parse(fs.readFileSync(file, "utf8"));
};

const writeJson = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const adminUser = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
const adminHash = bcrypt.hashSync(adminPassword, 10);

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 4
    }
}));

app.use(
    "/vendor",
    express.static(path.join(__dirname, "node_modules", "bootstrap", "dist"))
);

app.use(express.static(path.join(__dirname, "public")));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: "draft-7",
    legacyHeaders: false
});

const requireAdmin = (req, res, next) => {
    return req.session.isAdmin
        ? next()
        : res.status(401).json({
            error: "Please sign in as an administrator."
        });
};

// EVENTS

app.get("/api/events", (req, res) => {
    res.json(readJson(EVENTS_FILE));
});

// WEBSITE REGISTRATION

app.post("/api/register", async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            college,
            eventId,
            teamName,
            notes
        } = req.body;

        if (
            ![fullName, email, phone, college, eventId].every(
                value => typeof value === "string" && value.trim()
            )
        ) {
            return res.status(400).json({
                error: "Please complete all required fields."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                error: "Enter a valid email address."
            });
        }

        const events = readJson(EVENTS_FILE);
        const event = events.find(item => item.id === eventId);

        if (!event || event.status !== "Open") {
            return res.status(400).json({
                error: "This case is not currently accepting registrations."
            });
        }

        const registrations = readJson(REG_FILE);

        const duplicate = registrations.some(registration =>
            registration.email.toLowerCase() === email.trim().toLowerCase() &&
            registration.eventId === eventId
        );

        if (duplicate) {
            return res.status(409).json({
                error: "This email is already registered for this event."
            });
        }

        const registration = {
            id: "REG-" + Date.now().toString(36).toUpperCase(),
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            college: college.trim(),
            eventId,
            eventTitle: event.title,
            teamName: (teamName || "").trim(),
            notes: (notes || "").trim(),
            createdAt: new Date().toISOString(),
            status: "Received",
            source: "Website",
            sheetSynced: false
        };

        registrations.unshift(registration);
        writeJson(REG_FILE, registrations);

        let sheetSynced = false;

        try {
            await appendRegistration(registration);

            sheetSynced = true;

            const updatedRegistrations = readJson(REG_FILE);

            const savedRegistration = updatedRegistrations.find(
                item => item.id === registration.id
            );

            if (savedRegistration) {
                savedRegistration.sheetSynced = true;
                writeJson(REG_FILE, updatedRegistrations);
            }

            console.log(
                "Google Sheets sync successful:",
                registration.id
            );

        } catch (error) {
            console.error(
                "Google Sheets sync failed:",
                error.message
            );
        }

        return res.status(201).json({
            message: sheetSynced
                ? "Registration received and synchronized with Google Sheets."
                : "Registration saved locally. Google Sheets synchronization is pending.",
            reference: registration.id,
            sheetSynced
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            error: "Unable to process your registration. Please try again."
        });
    }
});

// ADMIN LOGIN

app.post("/api/admin/login", loginLimiter, (req, res) => {
    const { username, password } = req.body;

    if (
        username !== adminUser ||
        !bcrypt.compareSync(String(password || ""), adminHash)
    ) {
        return res.status(401).json({
            error: "Invalid administrator credentials."
        });
    }

    req.session.isAdmin = true;

    res.json({
        message: "Signed in."
    });
});

// ADMIN LOGOUT

app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Signed out."
        });
    });
});

// ADMIN SESSION

app.get("/api/admin/me", (req, res) => {
    res.json({
        authenticated: !!req.session.isAdmin
    });
});

// ADMIN OVERVIEW

app.get("/api/admin/overview", requireAdmin, (req, res) => {
    const registrations = readJson(REG_FILE);
    const events = readJson(EVENTS_FILE);

    res.json({
        totalRegistrations: registrations.length,
        totalEvents: events.length,
        recentRegistrations: registrations.slice(0, 8),
        registrationsByEvent: events.map(event => ({
            title: event.title,
            count: registrations.filter(
                registration => registration.eventId === event.id
            ).length
        }))
    });
});

// ADMIN REGISTRATIONS

app.get("/api/admin/registrations", requireAdmin, (req, res) => {
    res.json(readJson(REG_FILE));
});

// UPDATE REGISTRATION STATUS

app.patch("/api/admin/registrations/:id", requireAdmin, (req, res) => {
    const registrations = readJson(REG_FILE);

    const item = registrations.find(
        registration => registration.id === req.params.id
    );

    if (!item) {
        return res.status(404).json({
            error: "Registration not found."
        });
    }

    const allowed = [
        "Received",
        "Confirmed",
        "Waitlisted",
        "Cancelled"
    ];

    if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
            error: "Invalid status."
        });
    }

    item.status = req.body.status;

    writeJson(REG_FILE, registrations);

    res.json(item);
});

// ADMIN EVENTS

app.get("/api/admin/events", requireAdmin, (req, res) => {
    res.json(readJson(EVENTS_FILE));
});

// ADD EVENT

app.post("/api/admin/events", requireAdmin, (req, res) => {
    const {
        title,
        category,
        description,
        venue,
        time,
        status,
        prize
    } = req.body;

    if (
        ![title, category, description].every(
            value => typeof value === "string" && value.trim()
        )
    ) {
        return res.status(400).json({
            error: "Title, category and description are required."
        });
    }

    const events = readJson(EVENTS_FILE);

    const event = {
        id: "case-" + Date.now().toString(36),
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        venue: (venue || "To be announced").trim(),
        time: (time || "To be announced").trim(),
        status: status === "Closed" ? "Closed" : "Open",
        prize: (prize || "").trim()
    };

    events.push(event);
    writeJson(EVENTS_FILE, events);

    res.status(201).json(event);
});

// EDIT EVENT

app.put("/api/admin/events/:id", requireAdmin, (req, res) => {
    const events = readJson(EVENTS_FILE);

    const item = events.find(event => event.id === req.params.id);

    if (!item) {
        return res.status(404).json({
            error: "Event not found."
        });
    }

    const {
        title,
        category,
        description,
        venue,
        time,
        status,
        prize
    } = req.body;

    if (
        ![title, category, description].every(
            value => typeof value === "string" && value.trim()
        )
    ) {
        return res.status(400).json({
            error: "Title, category and description are required."
        });
    }

    Object.assign(item, {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        venue: (venue || "To be announced").trim(),
        time: (time || "To be announced").trim(),
        status: status === "Closed" ? "Closed" : "Open",
        prize: (prize || "").trim()
    });

    writeJson(EVENTS_FILE, events);

    res.json(item);
});

// DELETE EVENT

app.delete("/api/admin/events/:id", requireAdmin, (req, res) => {
    const events = readJson(EVENTS_FILE);

    const next = events.filter(
        event => event.id !== req.params.id
    );

    if (next.length === events.length) {
        return res.status(404).json({
            error: "Event not found."
        });
    }

    writeJson(EVENTS_FILE, next);

    res.json({
        message: "Event deleted."
    });
});

// ADMIN PAGE

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// MAIN WEBSITE

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// START SERVER

app.listen(PORT, () => {
    console.log(
        `The Crime Files is running at http://localhost:${PORT}`
    );
});
