const express = require("express");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const path = require("path");
const axios = require("axios");
const Database = require("better-sqlite3");

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ===== SQLite Setup =====
const db = new Database("vectorDB.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    chunk TEXT,
    embedding TEXT
  )
`);

// ===== Utility Functions =====
function chunkText(text, chunkSize = 300, overlap = 50) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function embedText(text) {
  try {
    const res = await axios.post("http://127.0.0.1:11434/api/embeddings", {
      model: "llama3",
      prompt: text,
    });
    return res.data.embedding;
  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// ===== Upload Route =====
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file?.path;
  const fileExt = path.extname(req.file?.originalname || "").toLowerCase();
  let text = "";

  try {
    if (fileExt === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (fileExt === ".txt") {
      text = fs.readFileSync(filePath, "utf8");
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const chunks = chunkText(text);
    const insertStmt = db.prepare(`
      INSERT INTO embeddings (filename, chunk, embedding)
      VALUES (?, ?, ?)
    `);

    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      if (embedding) {
        insertStmt.run(req.file.originalname, chunk, JSON.stringify(embedding));
      }
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, chunks: chunks.length });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: "Failed to process file" });
  }
});

// ===== Chat Route =====
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  const model = req.query.model || "llama3";

  try {
    const questionEmbedding = await embedText(userMessage);
    if (!questionEmbedding) throw new Error("Question embedding failed");

    const rows = db.prepare("SELECT * FROM embeddings").all();
    const vectorDB = rows.map((row) => ({
      chunk: row.chunk,
      embedding: JSON.parse(row.embedding),
      filename: row.filename,
    }));

    const rankedChunks = vectorDB
      .map((item) => ({
        chunk: item.chunk,
        embedding: item.embedding,
        similarity: cosineSimilarity(item.embedding, questionEmbedding),
        filename: item.filename,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    // 🔍 Build context if available
    let contextText = "";
    if (rankedChunks.length > 0) {
      const grouped = {};
      rankedChunks.forEach(({ chunk, filename }) => {
        grouped[filename] = grouped[filename] || [];
        grouped[filename].push(chunk);
      });

      contextText = Object.entries(grouped)
        .map(
          ([file, chunks]) =>
            `📄 **From file: ${file}**\n\n${chunks.join("\n\n---\n\n")}`
        )
        .join("\n\n");
    }

    // 🧠 Prompt Assembly
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful AI assistant who answers clearly and uses Markdown formatting. If context is provided, use it. Otherwise answer independently.",
      },
      {
        role: "user",
        content:
          contextText.length > 0
            ? `You're given relevant context from user files:\n\n${contextText}\n\nNow answer:\n${userMessage}`
            : userMessage,
      },
    ];

    let reply;

    if (model.includes("deepseek")) {
      const generateRes = await axios.post(
        "http://127.0.0.1:11434/api/generate",
        {
          model,
          prompt: messages[1].content,
          stream: false,
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          max_tokens: 512,
        }
      );
      reply = generateRes.data.response;
    } else {
      const chatRes = await axios.post("http://127.0.0.1:11434/api/chat", {
        model,
        messages,
        stream: false,
      });
      reply = chatRes.data.message.content;
    }

    res.json({ reply });
  } catch (err) {
    console.error("❌ Ollama chat error:", err.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Ollama chat failed" });
    }
  }
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
