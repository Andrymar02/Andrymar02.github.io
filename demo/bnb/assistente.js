/* ==========================================================================
   Assistente di Casa Zagara: chat sul sito che risponde ai clienti,
   controlla le date libere e porta alla prenotazione su WhatsApp.

   Due modalità:
   - ENDPOINT vuoto  -> modalità demo: risposte preparate in questo file,
                         calcolate sui dati veri della pagina (camere, prezzi,
                         calendario). Nessun costo, funziona su GitHub Pages.
   - ENDPOINT pieno  -> ogni messaggio va al server (cartella ai-assistant/),
                         che lo passa al modello AI con i dati della struttura.
   Usa CAMERE, occupato(), euro() e NUMERO_WHATSAPP definiti in index.html.
   ========================================================================== */
(() => {
  const ENDPOINT = "";            // es. "https://tuo-server.onrender.com/api/chat"
  const NOME = "Zagara";

  /* ---------- stile ---------- */
  const css = `
  .az-bottone{position:fixed;right:22px;bottom:22px;z-index:9000;display:flex;align-items:center;gap:10px;
    background:var(--cobalto,#1E4C9A);color:#fff;border:0;border-radius:999px;padding:13px 20px 13px 14px;
    font:600 15px var(--sans,system-ui);cursor:pointer;box-shadow:0 12px 30px -8px rgba(22,32,46,.55)}
  .az-bottone:hover{background:#173D7D}
  .az-bottone i{width:30px;height:30px;border-radius:50%;background:var(--limone,#E7B417);display:grid;place-items:center;
    font-style:normal;color:#16202E;font-weight:700}
  .az-pannello{position:fixed;right:22px;bottom:22px;z-index:9001;width:370px;max-width:calc(100vw - 24px);
    height:560px;max-height:calc(100vh - 44px);background:#fff;border-radius:16px;overflow:hidden;display:none;flex-direction:column;
    box-shadow:0 24px 60px -12px rgba(22,32,46,.5);font-family:var(--sans,system-ui);color:#16202E}
  .az-pannello.aperto{display:flex}
  .az-testa{background:var(--cobalto,#1E4C9A);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}
  .az-testa i{width:36px;height:36px;border-radius:50%;background:var(--limone,#E7B417);display:grid;place-items:center;
    font-style:normal;color:#16202E;font-weight:700;flex:none}
  .az-testa b{display:block;font-size:16px}
  .az-testa small{font-size:12.5px;opacity:.8}
  .az-chiudi{margin-left:auto;background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:4px 6px}
  .az-nota{background:#FFF8E1;color:#6B5200;font-size:12.5px;padding:7px 14px;border-bottom:1px solid #F2E6BF}
  .az-msg{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px;background:#F6F8FB}
  .az-b{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.45;white-space:pre-line}
  .az-b.bot{background:#fff;border:1px solid #E3E8EF;border-bottom-left-radius:4px;align-self:flex-start}
  .az-b.io{background:var(--cobalto,#1E4C9A);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
  .az-b.bot b{font-weight:700}
  .az-scrive{align-self:flex-start;background:#fff;border:1px solid #E3E8EF;border-radius:14px;padding:12px 14px;display:flex;gap:4px}
  .az-scrive span{width:7px;height:7px;border-radius:50%;background:#9AA6B8;animation:az-p 1s infinite}
  .az-scrive span:nth-child(2){animation-delay:.15s}.az-scrive span:nth-child(3){animation-delay:.3s}
  @keyframes az-p{50%{opacity:.25}}
  .az-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 4px;background:#F6F8FB}
  .az-chips button{font:500 13px var(--sans,system-ui);background:#fff;color:var(--cobalto,#1E4C9A);border:1.5px solid #C9D8F0;
    border-radius:999px;padding:6px 11px;cursor:pointer}
  .az-chips button:hover{border-color:var(--cobalto,#1E4C9A)}
  .az-azione{align-self:flex-start;font:600 14px var(--sans,system-ui);background:var(--cobalto,#1E4C9A);color:#fff;border:0;
    border-radius:999px;padding:8px 14px;cursor:pointer}
  .az-form{display:flex;gap:8px;padding:10px 12px 12px;border-top:1px solid #E3E8EF;background:#fff}
  .az-form input{flex:1;font:15px var(--sans,system-ui);border:1.5px solid #DCE2EA;border-radius:999px;padding:10px 14px;min-width:0}
  .az-form input:focus{outline:none;border-color:var(--cobalto,#1E4C9A)}
  .az-form button{font:600 14px var(--sans,system-ui);background:var(--cobalto,#1E4C9A);color:#fff;border:0;border-radius:999px;padding:0 16px;cursor:pointer}
  @media (prefers-reduced-motion: reduce){ .az-scrive span{animation:none} }`;
  document.head.insertAdjacentHTML('beforeend', '<style>' + css + '</style>');

  /* ---------- struttura ---------- */
  document.body.insertAdjacentHTML('beforeend', `
  <button class="az-bottone" type="button" aria-expanded="false" aria-controls="az-pannello"><i>Z</i>Domande? Chiedi a ${NOME}</button>
  <div class="az-pannello" id="az-pannello" role="dialog" aria-label="Assistente di Casa Zagara">
    <div class="az-testa"><i>Z</i><div><b>${NOME}</b><small>Assistente di Casa Zagara · risponde subito</small></div>
      <button class="az-chiudi" type="button" aria-label="Chiudi">×</button></div>
    ${ENDPOINT ? '' : '<div class="az-nota">Modalità demo: risposte preparate. La versione completa usa un modello AI.</div>'}
    <div class="az-msg" id="az-msg" aria-live="polite"></div>
    <div class="az-chips" id="az-chips"></div>
    <form class="az-form" id="az-form"><input id="az-in" autocomplete="off" placeholder="Scrivi una domanda…" aria-label="Messaggio">
      <button type="submit">Invia</button></form>
  </div>`);

  const pannello = document.getElementById('az-pannello');
  const bottone = document.querySelector('.az-bottone');
  const box = document.getElementById('az-msg');
  const chips = document.getElementById('az-chips');
  const input = document.getElementById('az-in');
  let iniziato = false, lingua = 'it';
  const storia = [];                                   // per la modalità con server
  const stato = {camera:null, da:null, a:null, ospiti:2, attesa:null, nome:''};

  function apri(){
    pannello.classList.add('aperto'); bottone.style.display = 'none'; bottone.setAttribute('aria-expanded', 'true');
    if(!iniziato){ iniziato = true; rispondi(T('ciao')); mostraChips(); }
    input.focus();
  }
  function chiudi(){ pannello.classList.remove('aperto'); bottone.style.display = ''; bottone.setAttribute('aria-expanded', 'false'); bottone.focus(); }
  bottone.addEventListener('click', apri);
  pannello.querySelector('.az-chiudi').addEventListener('click', chiudi);
  window.azApri = apri;                                // usata dalla registrazione del video

  function bolla(testo, chi){
    const b = document.createElement('div'); b.className = 'az-b ' + chi;
    if(chi === 'bot') b.innerHTML = testo; else b.textContent = testo;
    box.appendChild(b); box.scrollTop = box.scrollHeight; return b;
  }
  function rispondi(testo, azione){
    const s = document.createElement('div'); s.className = 'az-scrive'; s.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(s); box.scrollTop = box.scrollHeight;
    const attesa = Math.min(1400, 450 + testo.length * 4);
    setTimeout(() => {
      s.remove(); bolla(testo, 'bot');
      if(azione){
        const a = document.createElement('button'); a.type = 'button'; a.className = 'az-azione'; a.textContent = azione.testo;
        a.addEventListener('click', azione.fai); box.appendChild(a); box.scrollTop = box.scrollHeight;
      }
    }, attesa);
  }

  /* ---------- testi in due lingue ---------- */
  const TESTI = {
    ciao: {it:`Ciao! Sono ${NOME}, l'assistente di Casa Zagara. Posso dirti quali camere sono libere, i prezzi e come arrivare. Cosa ti serve?`,
           en:`Hi! I'm ${NOME}, Casa Zagara's assistant. I can check free rooms, prices and directions. How can I help?`},
    colazione: {it:'Sì, la colazione è sempre inclusa: granita, brioche col tuppo, ricotta e frutta, servite in cortile dalle 8 alle 10:30.',
                en:'Yes, breakfast is always included: granita, brioche, ricotta and fruit, served in the courtyard from 8 to 10:30.'},
    orari: {it:'Il check-in è dalle 14:00, anche in autonomia con un codice. Il check-out è entro le 10:30.',
            en:'Check-in is from 2 pm, also self check-in with a code. Check-out is by 10:30 am.'},
    arrivo: {it:"Dall'aeroporto di Catania c'è il bus per Siracusa (circa 1 ora). Dalla stazione siamo a 20 minuti a piedi, oppure 5 minuti in taxi. Ortigia è zona a traffico limitato: se arrivi in auto, il parcheggio pubblico più comodo è a 5 minuti a piedi.",
             en:'From Catania airport there is a bus to Siracusa (about 1 hour). From the station we are a 20-minute walk or 5 minutes by taxi. Ortigia is a limited-traffic zone: if you drive, the nearest public car park is a 5-minute walk.'},
    parcheggio: {it:"Ortigia è zona a traffico limitato, quindi non abbiamo un parcheggio privato. Il parcheggio pubblico più comodo è a 5 minuti a piedi: puoi lasciare l'auto lì e ti aiutiamo noi con le valigie.",
                 en:'Ortigia is a limited-traffic zone, so we have no private parking. The nearest public car park is a 5-minute walk: leave the car there and we help you with the luggage.'},
    wifi: {it:'Sì, c\'è la fibra in tutta la casa. Va bene anche per lavorare.', en:'Yes, there is fast fibre Wi-Fi in the whole house, good for working too.'},
    animali: {it:'Gli animali piccoli sono benvenuti, basta avvisarci prima. Ti conviene scriverlo nella richiesta di prenotazione.',
              en:'Small pets are welcome, just let us know in advance. You can add it to your booking request.'},
    date: {it:'Per quali date? Scrivimi per esempio "dal 12 al 15 dicembre".', en:'For which dates? Write for example "12 to 15 December".'},
    nome: {it:'Perfetto. Come ti chiami? Lo metto nella richiesta.', en:'Great. What is your name? I will add it to the request.'},
    non_so: {it:'Su questo non sono sicura. Posso farti scrivere direttamente a Lucia, la proprietaria, su WhatsApp: ti risponde in giornata.',
             en:"I'm not sure about that. I can put you in touch with Lucia, the owner, on WhatsApp: she replies the same day."},
  };
  const T = k => TESTI[k][lingua];

  const MESI = {gen:0,genn:0,gennaio:0,feb:1,febbraio:1,mar:2,marzo:2,apr:3,aprile:3,mag:4,maggio:4,giu:5,giugno:5,lug:6,luglio:6,
    ago:7,agosto:7,set:8,sett:8,settembre:8,ott:9,ottobre:9,nov:10,novembre:10,dic:11,dicembre:11,
    jan:0,january:0,february:1,march:2,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,september:8,oct:9,october:9,
    november:10,dec:11,december:11};

  function leggiDate(t){
    const oggi = new Date(); oggi.setHours(0,0,0,0);
    let m = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})\D+(\d{1,2})\s*\/\s*(\d{1,2})/);
    let da, a;
    if(m){ da = [+m[1], +m[2]-1]; a = [+m[3], +m[4]-1]; }
    else {
      const mese = Object.keys(MESI).sort((x, y) => y.length - x.length).find(k => new RegExp('\\b' + k + '\\b').test(t));
      const num = (t.match(/\b\d{1,2}\b/g) || []).map(Number).filter(n => n >= 1 && n <= 31);
      if(mese === undefined || num.length < 2) return null;
      da = [num[0], MESI[mese]]; a = [num[1], MESI[mese]];
    }
    let anno = oggi.getFullYear();
    let d1 = new Date(anno, da[1], da[0]);
    if(d1 < oggi){ anno++; d1 = new Date(anno, da[1], da[0]); }
    let d2 = new Date(anno, a[1], a[0]);
    if(d2 <= d1) d2 = new Date(anno, a[1] + (a[1] === da[1] ? 1 : 12), a[0]);
    return [d1, d2];
  }
  function liberaPer(c, da, a){ for(let d = new Date(da); d < a; d.setDate(d.getDate() + 1)) if(occupato(c, d)) return false; return true; }
  const notti = (da, a) => Math.round((a - da) / 864e5);
  const giorno = d => d.toLocaleDateString(lingua === 'it' ? 'it-IT' : 'en-GB', {day:'numeric', month:'long'});
  const periodo = (da, a) => {                       // "dal 12 al 15 dicembre" / "12 to 15 December"
    const stesso = da.getMonth() === a.getMonth();
    if(lingua === 'it') return stesso ? `dal ${da.getDate()} al ${giorno(a)}` : `dal ${giorno(da)} al ${giorno(a)}`;
    return stesso ? `${da.getDate()} to ${giorno(a)}` : `${giorno(da)} to ${giorno(a)}`;
  };

  function disponibilita(da, a){
    const n = notti(da, a);
    const ok = CAMERE.map((c, i) => ({c, i})).filter(x => liberaPer(x.i, da, a) && x.c.max >= stato.ospiti);
    stato.da = da; stato.a = a;
    if(!ok.length){
      rispondi(lingua === 'it'
        ? `Mi dispiace, ${periodo(da, a)} non ci sono camere libere per ${stato.ospiti} persone. Vuoi provare con altre date?`
          : `Sorry, from ${periodo(da, a)} there are no free rooms for ${stato.ospiti} guests. Want to try other dates?`);
      return;
    }
    const righe = ok.map(x => `• <b>${x.c.nome}</b>: ${n} ${lingua === 'it' ? (n === 1 ? 'notte' : 'notti') : (n === 1 ? 'night' : 'nights')} × ${euro(x.c.prezzo)} = <b>${euro(n * x.c.prezzo)}</b>`).join('\n');
    stato.camera = ok[0].i;
    rispondi((lingua === 'it' ? `${periodo(da, a).replace(/^d/, 'D')} sono libere:\n` : `From ${periodo(da, a)} these rooms are free:\n`) + righe +
      (lingua === 'it' ? '\nColazione inclusa. Vuoi che prepari la richiesta?' : '\nBreakfast included. Shall I prepare the request?'),
      {testo: lingua === 'it' ? `Prenota la ${ok[0].c.nome}` : `Book ${ok[0].c.nome}`, fai: () => chiediNome()});
  }
  function chiediNome(){ stato.attesa = 'nome'; rispondi(T('nome')); }
  function invia(){
    const c = CAMERE[stato.camera], n = notti(stato.da, stato.a);
    const msg = `Ciao, vorrei prenotare la ${c.nome} ${periodo(stato.da, stato.a)} (${n} notti) per ${stato.ospiti} ospiti. Mi chiamo ${stato.nome}. Totale indicato: ${euro(n * c.prezzo)}.`;
    if(NUMERO_WHATSAPP){ window.open('https://wa.me/' + NUMERO_WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank', 'noopener'); }
    rispondi((lingua === 'it' ? 'Ecco la richiesta, pronta per WhatsApp:\n\n' : 'Here is your request, ready for WhatsApp:\n\n') + '<i>' + msg + '</i>' +
      (NUMERO_WHATSAPP ? '' : (lingua === 'it' ? '\n\n(In questa demo il messaggio non viene inviato.)' : '\n\n(In this demo the message is not sent.)')));
  }

  /* ---------- capire la domanda (modalità demo) ---------- */
  function capisci(t){
    const s = t.toLowerCase();
    if(stato.attesa !== 'nome') lingua = /\b(the|is|are|do|you|room|rooms|free|available|breakfast|how|book|price|hello|hi|can)\b/.test(s) ? 'en' : 'it';
    const p = s.match(/(\d)\s*(persone|ospiti|people|guests|adulti|adults)/); if(p) stato.ospiti = +p[1];

    if(stato.attesa === 'nome'){ stato.nome = t.trim().replace(/^(mi chiamo|sono|i'm|i am|my name is)\s+/i, ''); stato.attesa = null; return invia(); }
    const date = leggiDate(s);
    if(date) return disponibilita(date[0], date[1]);
    if(/colazion|breakfast/.test(s)) return rispondi(T('colazione'));
    if(/check|orari|a che ora|what time|arriv(o|are) (la sera|tardi)/.test(s)) return rispondi(T('orari'));
    if(/parche|park|auto\b|car\b|ztl/.test(s)) return rispondi(T('parcheggio'));
    if(/aeroport|airport|stazion|station|arriv|get there/.test(s)) return rispondi(T('arrivo'));
    if(/wi-?fi|internet/.test(s)) return rispondi(T('wifi'));
    if(/cane|gatto|animal|dog|cat|pet/.test(s)) return rispondi(T('animali'));
    if(/camer|room|prezz|price|cost|quanto/.test(s)){
      const r = CAMERE.map(c => `• <b>${c.nome}</b> (${c.mq} m², ${lingua === 'it' ? 'fino a' : 'up to'} ${c.max}): ${euro(c.prezzo)} ${lingua === 'it' ? 'a notte' : 'per night'}`).join('\n');
      return rispondi((lingua === 'it' ? 'Abbiamo tre camere, tutte con bagno privato e colazione inclusa:\n' : 'We have three rooms, all with private bathroom and breakfast included:\n') + r +
        (lingua === 'it' ? '\nVuoi che controlli le date?' : '\nShall I check your dates?'));
    }
    if(/prenot|book|disponib|liber|posto|available|free/.test(s)){ stato.attesa = 'date'; return rispondi(T('date')); }
    if(/^(ciao|salve|buongiorno|hello|hi|hey)\b/.test(s)) return rispondi(T('ciao'));
    return rispondi(T('non_so'), {testo: lingua === 'it' ? 'Scrivi a Lucia su WhatsApp' : 'Message Lucia on WhatsApp', fai: () => {
      if(NUMERO_WHATSAPP) window.open('https://wa.me/' + NUMERO_WHATSAPP, '_blank', 'noopener');
      else rispondi(lingua === 'it' ? "(In questa demo WhatsApp non si apre. Sul sito vero si aprirebbe la chat con la struttura.)" : '(In this demo WhatsApp does not open. On the real site it opens a chat with the owner.)');
    }});
  }

  /* ---------- modalità con server AI ---------- */
  async function chiediAlServer(t){
    storia.push({role:'user', content:t});
    const s = document.createElement('div'); s.className = 'az-scrive'; s.innerHTML = '<span></span><span></span><span></span>'; box.appendChild(s);
    try{
      const r = await fetch(ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:storia})});
      const j = await r.json(); s.remove();
      storia.push({role:'assistant', content:j.reply}); bolla(j.reply.replace(/</g, '&lt;'), 'bot');
    }catch(e){ s.remove(); bolla(T('non_so'), 'bot'); }
  }

  function utente(t){
    if(!t.trim()) return;
    bolla(t, 'io'); chips.innerHTML = '';
    if(ENDPOINT) chiediAlServer(t); else capisci(t);
  }
  document.getElementById('az-form').addEventListener('submit', e => { e.preventDefault(); utente(input.value); input.value = ''; });

  function mostraChips(){
    const prossimo = new Date(); prossimo.setMonth(prossimo.getMonth() + 1);
    const mese = prossimo.toLocaleDateString('it-IT', {month:'long'});
    const domande = ['Che camere avete?', `C'è posto dal 12 al 15 ${mese}?`, 'La colazione è inclusa?', "Come arrivo dall'aeroporto?"];
    chips.innerHTML = domande.map(d => `<button type="button">${d}</button>`).join('');
    chips.querySelectorAll('button').forEach(b => b.addEventListener('click', () => utente(b.textContent)));
  }
})();
