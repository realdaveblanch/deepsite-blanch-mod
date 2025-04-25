import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import ollama from "ollama";

dotenv.config();

const app = express();
const ipAddresses = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.APP_PORT || 3000;

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "dist")));

app.post("/api/ask-ai", async (req, res) => {
  const { prompt, previousPrompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ ok: false, message: "Missing prompt." });
  }




  try {
    // Headers necesarios para streaming de texto correctamente al frontend
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await ollama.chat({
      model: "llama3",
      messages: [
        ...(previousPrompt ? [{ role: "user", content: previousPrompt }] : []),
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.message?.content || "";
      res.write(content);
    }

    res.end();
  } catch (error) {
    console.error(error);
    // Aquí importante: no se puede usar `res.status(...).json(...)` si ya se escribió algo en el stream
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        message: error.message || "An unexpected error occurred.",
      });
    } else {
      res.end();
    }
  }
});


app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
