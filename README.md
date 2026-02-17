# Privacy Inspector

## Running the app

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Pages

| Page | URL |
|------|-----|
| Upload | http://localhost:5173/ |
| Analysis | http://localhost:5173/analysis |
| Chatbot | http://localhost:5173/chatbot |

---

### Upload (`/`)
Upload an `.ndjson` or `.jsonl` privacy report file. Once uploaded, click **Analyze** to proceed to the analysis page.

### Analysis (`/analysis`)
Displays a breakdown of which apps accessed your data (location, contacts, photos), along with risk scores and recommendations for each app.

### Chatbot (`/chatbot`)
An AI assistant that answers questions about your privacy report. Ask things like *"Why is KakaoTalk suspicious?"* or *"What should I do to protect my privacy?"*
