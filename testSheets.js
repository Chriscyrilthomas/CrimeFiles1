
require("dotenv").config();

const { google } = require("googleapis");
const { authorize } = require("./googleSheets");

async function testConnection() {
    try {
        console.log("Connecting to Google Sheets...");

        const auth = await authorize();

        const sheets = google.sheets({
            version: "v4",
            auth
        });

        const response = await sheets.spreadsheets.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            fields: "properties.title,sheets.properties"
        });

        console.log("Google Sheets connected successfully!");
        console.log("Spreadsheet:", response.data.properties.title);

        response.data.sheets.forEach(sheet => {
            console.log("Tab:", sheet.properties.title);
        });

    } catch (error) {
        console.error("Google Sheets connection failed:");
        console.error(error.message);
    }
}

testConnection();
