# Assistente AI per il sito di una struttura

Chat da mettere sul sito di un B&B, un hotel o un ristorante. Risponde alle domande dei clienti
(camere, prezzi, colazione, come arrivare), **controlla la disponibilità** sulle date richieste e
prepara la richiesta di prenotazione da inviare su WhatsApp.

Demo pubblica (in modalità demo, con risposte preparate):
https://andrymar02.github.io/demo/bnb/ → pulsante "Chiedi a Zagara" in basso a destra.

## Come è fatto

```
sito (assistente.js)  →  questo server (server.js)  →  API di Claude
                              │
                              └─ struttura.js: camere, prezzi, informazioni, disponibilità
```

- **`demo/bnb/assistente.js`**: la chat nel browser. Con `ENDPOINT` vuoto funziona in modalità
  demo; con `ENDPOINT` impostato manda ogni messaggio a questo server.
- **`server.js`**: riceve i messaggi, li passa al modello insieme ai dati della struttura e
  restituisce la risposta. Per date e disponibilità il modello usa lo strumento
  `controlla_disponibilita`, quindi non può inventare prezzi o camere libere.
- **`struttura.js`**: l'unico file da cambiare per un cliente nuovo.

La chiave API resta sul server e non arriva mai al browser. C'è un limite di 30 messaggi all'ora
per indirizzo IP, per tenere sotto controllo i costi.

## Avvio in locale

Serve Node.js 20.6 o più recente.

```bash
cd ai-assistant
npm install
cp .env.example .env      # poi inserisci la chiave in ANTHROPIC_API_KEY
npm start                 # il server parte su http://localhost:3000
npm test                  # prova il giro con lo strumento senza usare l'API vera
```

Poi in `demo/bnb/assistente.js` imposta `ENDPOINT = "http://localhost:3000/api/chat"`.

## Messa online

1. Pubblica la cartella `ai-assistant` su un servizio che ospita app Node.js.
2. Imposta le variabili d'ambiente `ANTHROPIC_API_KEY` e `ALLOWED_ORIGIN` (il dominio del sito).
3. Nel sito, imposta `ENDPOINT` con l'indirizzo del server seguito da `/api/chat`.

## Per un cliente nuovo

1. Copia i suoi dati in `struttura.js` (camere, prezzi, informazioni, numero WhatsApp).
2. Collega la disponibilità al suo calendario (Google Calendar, export iCal di Booking/Airbnb o un
   database) al posto dell'oggetto `OCCUPATE`.
3. Prova le domande più frequenti e affina le regole nel prompt di sistema in `server.js`.

I costi dell'API dipendono dal modello e dal numero di conversazioni: si controllano dalla console
di Anthropic, dove si può anche impostare un limite di spesa mensile.
