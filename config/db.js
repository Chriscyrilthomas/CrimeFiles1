const { MongoClient } = require("mongodb");

let client;
let database;

async function connectDB() {
    if (database) return database;

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    client = new MongoClient(uri);

    await client.connect();

    database = client.db("crimeFilesDB");

    await database.command({ ping: 1 });

    console.log("MongoDB connected successfully!");

    return database;
}

function getDB() {
    if (!database) {
        throw new Error("Database is not connected");
    }

    return database;
}

module.exports = { connectDB, getDB };