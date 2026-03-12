const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Basic Auth Middleware ---
const AUTH_USER = process.env.APP_USER;
const AUTH_PASS = process.env.APP_PASSWORD;

function basicAuth(req, res, next) {
  // If no credentials configured, skip auth
  if (!AUTH_USER || !AUTH_PASS) return next();

  // Allow health endpoint without auth
  if (req.path === "/api/health") return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Course Cover Engine"');
    return res.status(401).send("Authentication required");
  }

  const base64 = authHeader.split(" ")[1];
  const [user, pass] = Buffer.from(base64, "base64").toString().split(":");

  if (user === AUTH_USER && pass === AUTH_PASS) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Course Cover Engine"');
  return res.status(401).send("Invalid credentials");
}

app.use(basicAuth);
// --- End Basic Auth ---

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Gemini API proxy
const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

app.post("/api/gemini/:model/:action", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY not configured on server" });

  const { model, action } = req.params;
  const url = `${GEMINI_BASE}/${model}:${action}?key=${key}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.text();
    res
      .status(response.status)
      .set("Content-Type", "application/json")
      .send(data);
  } catch (err) {
    console.error("Gemini proxy error:", err.message);
    res.status(502).json({ error: "Proxy error: " + err.message });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", hasKey: !!process.env.GEMINI_API_KEY });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Course Cover Engine running on port " + PORT);
  console.log("GEMINI_API_KEY: " + (process.env.GEMINI_API_KEY ? "configured" : "MISSING"));
  console.log("Auth: " + (AUTH_USER ? "enabled" : "disabled (no APP_USER set)"));
});
