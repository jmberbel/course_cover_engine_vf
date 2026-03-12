const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

app.post("/api/gemini/:model/:action", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }
  const { model, action } = req.params;
  const url = GEMINI_BASE + "/" + model + ":" + action + "?key=" + key;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.text();
    res.status(response.status).set("Content-Type", "application/json").send(data);
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
});
