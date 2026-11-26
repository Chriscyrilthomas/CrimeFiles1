require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const { appendRegistration } = require("./googleSheets");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, "data", "events.json");

function readEvents() {
    if (!fs.existsSync(EVENTS_FILE)) {
        throw new Error("data/events.json was not found.");
    }
    return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8"));
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/vendor", express.static(
    path.join(__dirname, "node_modules", "bootstrap", "dist")
));
app.use(express.static(path.join(__dirname, "public")));

const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false
});

app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "The Crime Files server is running." });
});

app.get("/api/events", (req, res) => {
    try {
        res.json(readEvents());
    } catch (error) {
        console.error("Events loading error:", error.message);
        res.status(500).json({ error: "Unable to load events." });
    }
});

app.post("/api/register", registrationLimiter, async (req, res) => {
    try {
        const { fullName, email, phone, college, eventId, teamName, notes } = req.body;

        if (![fullName, email, phone, college, eventId].every(
            value => typeof value === "string" && value.trim()
        )) {
            return res.status(400).json({
                error: "Please complete all required fields."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ error: "Enter a valid email address." });
        }

        const event = readEvents().find(item => item.id === eventId);

        if (!event || event.status !== "Open") {
            return res.status(400).json({
                error: "This event is not currently accepting registrations."
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
            teamName: typeof teamName === "string" ? teamName.trim() : "",
            notes: typeof notes === "string" ? notes.trim() : "",
            createdAt: new Date().toISOString(),
            status: "Received",
            source: "Website"
        };

        await appendRegistration(registration);

        return res.status(201).json({
            message: "Registration received and saved successfully.",
            reference: registration.id,
            sheetSynced: true
        });
    } catch (error) {
        console.error("Registration error:", error.message);
        return res.status(500).json({
            error: "Unable to save registration. Please try again."
        });
    }
});

app.use((req, res) => {
    if (req.method === "GET") {
        return res.sendFile(path.join(__dirname, "public", "index.html"));
    }
    return res.status(404).json({ error: "Not found." });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`The Crime Files is running at http://localhost:${PORT}`);
    });
}

module.exports = app;
