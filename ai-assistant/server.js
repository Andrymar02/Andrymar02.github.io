// Server dell'assistente: riceve i messaggi dalla chat del sito, li passa al
// modello AI con i dati della struttura e restituisce la risposta.
// La chiave API resta qui, sul server: non arriva mai al browser.
import express from "express";
import { STRUTTURA, controllaDisponibilita } from "./struttura.js";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "claude-haiku-5-5";
const ORIGINE = process.env.ALLOWED_ORIGIN || "*"; // es. "https://www.casazagara.it"

if (!API_KEY) {
  console.error("Manca ANTHROPIC_API_KEY: copia .env.example in .env e inserisci la chiave.");
  process.exit(1);
}

const oggi = () => new Date().toISOString().slice(0, 10);
const SISTEMA = () => `Sei l'assistente del sito di ${STRUTTURA.nome}, ${STRUTTURA.tipo} in ${STRUTTURA.indirizzo}.
Oggi è il ${oggi()}.

Camere:
${STRUTTURA.camere.map((c) => `- ${c.nome}: ${c.prezzo} € a notte, fino a ${c.max} ospiti, ${c.mq} m², ${c.note}`).join("\n")}

Informazioni:
${STRUTTURA.informazioni.map((i) => "- " + i).join("\n")}

Regole:
- Rispondi nella lingua del cliente, in modo breve e cordiale (al massimo 4 frasi).
- Per date e disponibilità usa SEMPRE lo strumento controlla_disponibilita. Non inventare mai disponibilità o prezzi.
- Se non conosci la risposta, dillo e proponi di scrivere a ${STRUTTURA.proprietaria} su WhatsApp.
- Quando il cliente vuole prenotare, chiedi il nome e riepiloga: camera, date, ospiti, totale. La conferma arriva da ${STRUTTURA.proprietaria}.
- Non chiedere mai dati di pagamento.`;

const STRUMENTI = [
  {
    name: "controlla_disponibilita",
    description: "Controlla quali camere sono libere tra due date e calcola il totale del soggiorno.",
    input_schema: {
      type: "object",
      properties: {
        arrivo: { type: "string", description: "Data di arrivo, formato AAAA-MM-GG" },
        partenza: { type: "string", description: "Data di partenza, formato AAAA-MM-GG" },
        ospiti: { type: "integer", description: "Numero di ospiti" },
      },
      required: ["arrivo", "partenza"],
    },
  },
];

async function chiamaModello(messages) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, system: SISTEMA(), tools: STRUMENTI, messages }),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
  return r.json();
}

// risponde, usando gli strumenti quante volte serve (massimo 3 giri)
export async function rispondi(storia) {
  const messages = storia.map((m) => ({ role: m.role, content: String(m.content) }));
  for (let giro = 0; giro < 3; giro++) {
    const risposta = await chiamaModello(messages);
    if (risposta.stop_reason !== "tool_use") {
      return risposta.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    }
    messages.push({ role: "assistant", content: risposta.content });
    const risultati = risposta.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({
        type: "tool_result",
        tool_use_id: b.id,
        content: JSON.stringify(b.name === "controlla_disponibilita" ? controllaDisponibilita(b.input) : { errore: "strumento sconosciuto" }),
      }));
    messages.push({ role: "user", content: risultati });
  }
  return "Scusa, non riesco a controllare in questo momento. Puoi scrivere direttamente a Lucia su WhatsApp?";
}

// limite semplice: massimo 30 messaggi all'ora per indirizzo IP, per non far salire i costi
const contatori = new Map();
function troppi(ip) {
  const ora = Math.floor(Date.now() / 3.6e6);
  const k = ip + ":" + ora;
  contatori.set(k, (contatori.get(k) || 0) + 1);
  if (contatori.size > 5000) contatori.clear();
  return contatori.get(k) > 30;
}

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", ORIGINE);
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/api/chat", async (req, res) => {
  const storia = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : [];
  if (!storia.length || storia.at(-1).role !== "user") return res.status(400).json({ reply: "Messaggio non valido." });
  if (troppi(req.ip)) return res.status(429).json({ reply: "Troppi messaggi, riprova tra poco." });
  try {
    res.json({ reply: await rispondi(storia) });
  } catch (e) {
    console.error(e.message);
    res.status(502).json({ reply: "Al momento non riesco a rispondere. Scrivi pure a Lucia su WhatsApp." });
  }
});

app.get("/", (req, res) => res.send("Assistente attivo."));
if (process.env.NODE_ENV !== "test") app.listen(PORT, () => console.log(`Assistente in ascolto sulla porta ${PORT}`));
