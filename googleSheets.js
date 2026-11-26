
const { google } = require("googleapis");
const path = require("path");

const KEY_FILE = path.join(__dirname, "service-account.json");

async function authorize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    return await auth.getClient();
}

async function appendRegistration(registration) {
    const auth = await authorize();

    const sheets = google.sheets({
        version: "v4",
        auth
    });

    const result = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${process.env.GOOGLE_SHEET_TAB || "Form Responses 1"}'!A:G`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
            values: [[
                registration.createdAt,
                registration.email,
                registration.fullName,
                registration.phone,
                registration.email,
                registration.college,
                registration.eventTitle
            ]]
        }
    });

    return result.data;
}

module.exports = { authorize, appendRegistration };
