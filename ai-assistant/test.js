// Prova il giro con lo strumento senza chiamare l'API vera: fetch viene sostituito.
process.env.ANTHROPIC_API_KEY = "test";
let chiamate = 0;
globalThis.fetch = async (url, opt) => {
  chiamate++;
  const corpo = JSON.parse(opt.body);
  if (chiamate === 1) {
    return { ok: true, json: async () => ({ stop_reason: "tool_use", content: [
      { type: "text", text: "Controllo subito." },
      { type: "tool_use", id: "t1", name: "controlla_disponibilita", input: { arrivo: "2026-12-12", partenza: "2026-12-15", ospiti: 2 } } ] }) };
  }
  const ultimo = corpo.messages.at(-1).content[0];
  if (ultimo.type !== "tool_result") throw new Error("manca tool_result");
  const dati = JSON.parse(ultimo.content);
  return { ok: true, json: async () => ({ stop_reason: "end_turn", content: [
    { type: "text", text: `Libere: ${dati.camere_libere.map((c) => c.camera + " " + c.totale + " €").join(", ")}` } ] }) };
};
const { rispondi } = await import("./server.js");
const r = await rispondi([{ role: "user", content: "C'è posto dal 12 al 15 dicembre?" }]);
console.log(r);
if (!r.includes("Camera Limone 255 €") || chiamate !== 2) { console.error("TEST FALLITO"); process.exit(1); }
console.log("OK: due chiamate, strumento eseguito, totale corretto");
