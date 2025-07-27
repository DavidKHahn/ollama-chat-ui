# 🧠 Local RAG Chat App with Ollama + SQLite + Citation + File Uploads

This app allows you to build your own local, private AI assistant with:

- **File uploads** (PDF and TXT)
- **RAG-based context injection**
- **Ollama models (e.g., LLaMA 3, DeepSeek Coder)**
- **SQLite embedding store**
- **Citation support (filename + line)**
- **Markdown rendering with code blocks**
- **LocalStorage-based chat history**
- **Streaming and pause/resume**
- **Mobile-responsive UI**

---

## ✅ Prerequisites

- Node.js (18+)
- [`ollama`](https://ollama.com) installed and running locally

Run:

```bash
ollama pull llama3
ollama pull deepseek-coder:6.7b-instruct
```

---

## ✅ Setup

```bash
git clone https://github.com/yourname/ollama-chat-ui.git
cd ollama-chat-ui
npm install
node server.js
```

Visit `http://localhost:3000`

---

## ✅ Folder Structure

```
ollama-chat-ui/
├── index.html          # frontend UI
├── server.js           # Node.js + Express backend
├── uploads/            # temp file store
├── vectorDB.sqlite     # SQLite DB (auto-generated)
```

---

## ✅ Features

| Feature                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| File Upload              | Accepts `.pdf` or `.txt`, chunks, embeds, and stores to SQLite   |
| RAG Chat                 | Retrieves most similar text chunks and uses them for context     |
| Ollama Integration       | Uses `/chat` or `/generate` depending on the model               |
| Model Selector           | Switch between `llama3`, `deepseek-coder`, etc.                  |
| Citation Support         | Adds `[source: filename.txt, line 3]` at the bottom of responses |
| Code Block Support       | Markdown + code syntax highlighting using `marked.js`            |
| Mobile-Responsive UI     | Clean centered layout for desktop/mobile                         |
| LocalStorage Chat Memory | Stores conversation history locally                              |
| Pause Button             | Pause response streaming anytime                                 |

---

## ✅ Teaching Breakdown

| Step              | Concept                                         |
| ----------------- | ----------------------------------------------- |
| 1. Upload         | Chunking + Embedding text into vectors          |
| 2. Ask a question | Embed query → cosine similarity → top 5 context |
| 3. Query LLM      | LLM responds using provided context             |
| 4. Render         | Markdown rendered with citations                |
| 5. History        | Stored in `localStorage`                        |

---

## ✅ Next Steps

- Add login/auth for SaaS
- Switch from SQLite to Chroma or Weaviate
- Export chats
- Add user profiles
- WebSocket live updates

---

## ✅ License

MIT License

---

> Built with ❤️ by David Hahn
