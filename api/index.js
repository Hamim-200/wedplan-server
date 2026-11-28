import { connectDB } from "../dist/config/db.js";
import app from "../dist/app.js";

let ready;

// Connects to MongoDB once per warm function, then hands the request to Express.
function init() {
    if (!ready) {
        ready = connectDB().catch((error) => {
            ready = undefined; // try again on the next request
            throw error;
        });
    }
    return ready;
}

export default async function handler(req, res) {
    try {
        await init();
    } catch (error) {
        console.error("Database connection failed:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, message: "Database unavailable" }));
        return;
    }
    return app(req, res);
}