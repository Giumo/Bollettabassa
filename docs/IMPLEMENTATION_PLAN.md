# BollettaBassa — Piano di implementazione

## Obiettivo della prima release

Consegnare un MVP Android/iOS local-first che trasformi dati inseriti dall'utente in una vista dei consumi e in consigli spiegabili. Nessun account, server o sincronizzazione è richiesto per la prima release. Il piano non prevede modifiche in questa fase: è la sequenza proposta per le fasi successive.

## Roadmap

### Fase 0 — Fondazioni e decisioni (milestone M0)

**Risultato:** base tecnica verificata e contratto del dominio approvato.

- Confermare target Android/iOS e mantenere il web come supporto secondario, perché SQLite web su Expo SDK 57 è alpha.
- Rinominare configurazione prodotto quando autorizzato (`name`, `slug`, scheme, icone e bundle identifiers).
- Definire copy privacy, retention, consenso località/notifiche e politica di cancellazione.
- Validare il modello tariffario italiano, le assunzioni di calcolo e i confini dell'MVP.
- Aggiungere test di dominio e convenzioni lint/format; non introdurre stato globale se non necessario.

**Criteri di uscita:** scope MVP firmato, wireframe a bassa fedeltà, schema dati revisionato, definizione del comportamento offline.

### Fase 1 — Persistenza locale (milestone M1)

**Risultato:** database robusto, isolato dalla UI e pronto per migrazioni.

- Installare soltanto le librerie Expo approvate e compatibili con SDK 57: SQLite e FileSystem; Location e Notifications restano per le fasi dedicate.
- Creare `data/db` con apertura asincrona, `foreign_keys`, WAL, migrazioni idempotenti e `PRAGMA user_version`.
- Implementare repository tipizzati per casa, presenza, apparecchi, bollette e FV.
- Gestire allegati nel filesystem dell'app, con pulizia transazionale/compensativa in caso di errore.
- Scrivere test unitari delle migrazioni e dei repository su database isolato.

**Criteri di uscita:** nuova installazione crea schema v1; riavvio conserva dati; upgrade da ogni versione supportata applica le migrazioni una sola volta; cancellare una bolletta elimina anche i metadati e il file associato.

### Fase 2 — Onboarding e raccolta dati (milestone M2)

**Risultato:** l'utente crea una fotografia minima della propria casa.

- Sostituire gradualmente le schermate template con route Expo Router per onboarding, dashboard e impostazioni.
- Realizzare form accessibili per casa, presenza, apparecchi e fotovoltaico, con validazione immediata e salvataggio esplicito.
- Aggiungere inserimento manuale bolletta: periodo, kWh, importi, fornitore e fasce opzionali.
- Aggiungere selezione e copia locale facoltativa di PDF/immagini; nessuna estrazione automatica nel MVP.
- Mostrare stato di completezza, senza bloccare l'uso quando i dati sono incompleti.

**Criteri di uscita:** un utente può creare, modificare e cancellare tutti i dati MVP senza rete; validazioni impediscono periodi bolletta incoerenti e valori impossibili.

### Fase 3 — Motore di insight (milestone M3)

**Risultato:** consigli deterministici, comprensibili e testati.

- Implementare use case puri per stima degli apparecchi, confronto fasce, orari di presenza e autoconsumo FV.
- Generare insight idempotenti: stesso snapshot, stessi risultati; archiviare assunzioni e intervallo di risparmio.
- Distinguere stime da dati osservati e applicare livello di confidenza.
- Progettare dashboard e dettaglio insight con CTA reversibili (es. “segna come non utile”), non automazioni.
- Coprire regole con casi unitari: nessuna bolletta, fasce incomplete, assenza di FV, dati incoerenti, stima a intervallo.

**Criteri di uscita:** ogni consiglio espone origine, vincoli e ipotesi; nessun risparmio numerico è mostrato senza dati sufficienti; analisi completata offline.

### Fase 4 — Meteo e località consensuali (milestone M4)

**Risultato:** contesto meteo opzionale, senza dipendenza dalla posizione continua.

- Integrare Expo Location solo dietro azione esplicita dell'utente e richiesta permission nel momento d'uso.
- Consentire località manuale come alternativa completa.
- Definire un adapter meteo sostituibile, cache locale con scadenza e comportamento offline.
- Usare il meteo per contestualizzare insight, non per attribuire causalità o modificare dati di bolletta.
- Documentare dati trasmessi a eventuale provider e aggiungere UI per revocare/cancellare la località.

**Criteri di uscita:** negare il permesso non compromette il flusso; località non viene letta in background; cache scaduta non genera dati spacciati per attuali.

### Fase 5 — Promemoria e rifinitura (milestone M5)

**Risultato:** promemoria utili, app pronta a una beta locale controllata.

- Integrare Expo Notifications per pianificare promemoria locali di bolletta/lettura contatore dopo consenso.
- Gestire modifica, annullamento, duplicati, fuso orario e permessi negati.
- Aggiungere export locale e cancellazione completa dei dati dopo aver definito il formato di backup.
- Eseguire test manuali su dispositivi reali Android/iOS, test di accessibilità e verifiche di aggiornamento schema.
- Rivedere copy, stati vuoti, errori, loading e performance su storico bollette realistico.

**Criteri di uscita:** notifiche non duplicate e revocabili; export e cancellazione verificati; flussi MVP percorribili offline; nessun dato personale nei log.

## Backlog prioritizzato

| Priorità | Tema | Dipendenze | Nota |
|---|---|---|---|
| P0 | Schema, migrazioni e repository | M0 | Fondamento per ogni funzionalità. |
| P0 | Onboarding casa, presenza, apparecchi, bolletta | M1 | Garantisce valore senza servizi esterni. |
| P0 | Motore insight basato su regole | M1–M2 | Deve essere puro e testabile. |
| P1 | Allegato locale bolletta | M1 | Utile, ma non condizione per analisi. |
| P1 | Fotovoltaico e autoconsumo | M1–M3 | Attivo solo per chi lo dichiara. |
| P1 | Località/meteo | M3 | Opt-in, con fallback manuale. |
| P1 | Notifiche locali | M2 | Mai requisito per il core flow. |
| P2 | Export/import | M5 | Richiede scelta formato e sicurezza. |
| P2 | OCR, smart meter, cloud | Post-MVP | Richiedono nuova valutazione privacy e UX. |

## Milestone tecniche trasversali

| Milestone | Evidenza richiesta |
|---|---|
| T1 — Compatibilità | Dipendenze installate con `expo install` per SDK 57; build/dev run su Android e iOS. |
| T2 — Qualità dati | Migrazioni testate, vincoli FK attivi, importi interi in centesimi, date coerenti. |
| T3 — Privacy | Permessi richiesti just-in-time; nessuna posizione in background; nessun upload implicito. |
| T4 — Affidabilità | Operazioni multi-tabella atomiche, file orfani gestiti, recovery dagli errori di import. |
| T5 — Spiegabilità | Ogni insight conserva input sintetici, formula/assunzioni, intervallo e confidenza. |
| T6 — Accessibilità | Label, ordine focus, contrasto, Dynamic Type/font scaling e messaggi errore leggibili. |
| T7 — Release readiness | Test su device fisici, modalità offline, database upgrade, cancellazione ed export verificati. |

## Strategia di test

- **Unitari:** calcoli di consumo/costo, validazioni, regole insight e migrazioni.
- **Integrazione:** repository SQLite, lifecycle degli allegati e deduplicazione notifiche.
- **Flussi manuali:** primo avvio, consenso/negazione permessi, inserimento bolletta, modifica/cancellazione, offline e app restart.
- **Regressione dati:** fixture con bollette a consumo unico, con fasce, FV e assenza di dati; confronti in centesimi/kWh senza floating point per la valuta.

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Dati bolletta eterogenei | Inserimento manuale guidato; campi opzionali; OCR fuori MVP. |
| Stime percepite come certe | Intervalli, confidenza, dati mancanti e spiegazione della regola. |
| Cambiamento API/compatibilità Expo | Usare le documentazioni versionate SDK 57 e `expo install`; verificare su device. |
| Perdita o accesso ai dati locali | Export esplicito, cancellazione completa, nessun log sensibile; valutare cifratura prima di trattare dati più sensibili. |
| Meteo non disponibile o consenso negato | Funzione opzionale, cache e alternativa manuale. |

## Definition of Done per ogni feature

Una feature è completata solo se ha tipi TypeScript, validazione, persistenza/migrazione se necessaria, stato vuoto/errore/loading, test proporzionati al rischio, accessibilità di base e assenza di dati personali nei log. Se usa una capability dispositivo, deve includere consenso just-in-time, percorso di rifiuto e revoca dalle impostazioni.
