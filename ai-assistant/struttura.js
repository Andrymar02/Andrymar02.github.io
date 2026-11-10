// Dati della struttura: per un cliente nuovo si cambia solo questo file.
export const STRUTTURA = {
  nome: "Casa Zagara",
  tipo: "B&B con tre camere",
  indirizzo: "Via della Giudecca 00, Ortigia, Siracusa",
  proprietaria: "Lucia",
  whatsapp: "", // es. "393401234567"
  camere: [
    { id: "limone", nome: "Camera Limone", prezzo: 85, max: 2, mq: 18, note: "letto matrimoniale, affaccio sul cortile" },
    { id: "gelsomino", nome: "Camera Gelsomino", prezzo: 105, max: 3, mq: 22, note: "matrimoniale e divano letto, balconcino" },
    { id: "aretusa", nome: "Suite Aretusa", prezzo: 140, max: 2, mq: 30, note: "letto king size, terrazzino vista mare, vasca" },
  ],
  informazioni: [
    "Colazione sempre inclusa, servita in cortile dalle 8 alle 10:30.",
    "Check-in dalle 14:00, anche in autonomia con codice. Check-out entro le 10:30.",
    "Ortigia è zona a traffico limitato: niente parcheggio privato, parcheggio pubblico a 5 minuti a piedi.",
    "Dall'aeroporto di Catania c'è un bus per Siracusa (circa 1 ora); dalla stazione sono 20 minuti a piedi.",
    "Wi-Fi in fibra in tutta la casa. Animali piccoli ammessi su richiesta.",
    "Tassa di soggiorno esclusa, si paga in struttura. Nessun pagamento online: la prenotazione si conferma via WhatsApp.",
  ],
};

// Disponibilità. Qui è un esempio; per un cliente vero si collega al suo
// calendario (Google Calendar, export iCal di Booking/Airbnb, database...).
const OCCUPATE = {
  // "aretusa": ["2026-12-24", "2026-12-25"],
};

function giorniTra(arrivo, partenza) {
  const out = [];
  for (let d = new Date(arrivo + "T12:00:00"); d < new Date(partenza + "T12:00:00"); d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function controllaDisponibilita({ arrivo, partenza, ospiti = 2 }) {
  const notti = giorniTra(arrivo, partenza);
  if (!notti.length) return { errore: "La data di partenza deve essere dopo quella di arrivo." };
  const libere = STRUTTURA.camere
    .filter((c) => c.max >= ospiti)
    .filter((c) => !notti.some((g) => (OCCUPATE[c.id] || []).includes(g)))
    .map((c) => ({ camera: c.nome, prezzo_notte: c.prezzo, notti: notti.length, totale: c.prezzo * notti.length }));
  return { arrivo, partenza, ospiti, camere_libere: libere };
}
