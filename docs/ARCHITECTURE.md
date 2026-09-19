# BollettaBassa — Architettura

## Visione del prodotto

BollettaBassa è un assistente **local-first** per ridurre il costo dell'elettricità domestica. Trasforma dati che l'utente già possiede — bollette, elettrodomestici, abitudini, fasce di presenza, meteo e produzione fotovoltaica — in una fotografia comprensibile dei consumi e in suggerimenti pratici, verificabili e non prescrittivi.

Il valore iniziale non è stimare con falsa precisione una bolletta: è aiutare l'utente a capire **cosa spostare, cosa ridurre e quando usare energia**, mostrando il perché, il possibile impatto e le assunzioni adottate.

Principi:

- privacy prima di tutto: profilo, bollette, documenti e analisi restano sul dispositivo;
- trasparenza: ogni consiglio espone dati e regole che l'hanno generato;
- gradualità: l'app è utile anche con pochi dati e migliora con l'onboarding;
- controllo dell'utente: permessi, notifiche e dati meteo sono espliciti e revocabili;
- accessibilità: linguaggio non tecnico, importi in euro e consumi in kWh.

## Stato del repository e vincoli

Il repository contiene un template Expo Router con `src/app/_layout.tsx`, `src/app/index.tsx` e `src/app/explore.tsx`; al momento non esistono funzionalità BollettaBassa rivolte all'utente. La configurazione usa Expo SDK 57, React Native 0.86, React 19 e TypeScript. La persistenza SQLite di base è disponibile tramite `expo-sqlite`; FileSystem, Location e Notifications restano fuori da questa milestone.

L'architettura proposta non cambia le schermate esistenti in questa fase. Le integrazioni future devono usare le API asincrone di Expo SDK 57: `expo-sqlite` persiste il database tra riavvii e supporta migrazioni/versionamento; la relativa documentazione raccomanda WAL e query parametrizzate per input utente. Il supporto SQLite sul web è alpha, pertanto il MVP deve avere come piattaforme di riferimento Android e iOS; il web può restare una superficie di sviluppo con funzionalità degradate.

## Perimetro MVP

L'MVP deve consentire di:

1. creare un profilo domestico essenziale (componenti, località facoltativa, tipo di casa);
2. definire finestre di presenza/assenza e preferenze di comfort;
3. censire elettrodomestici con potenza, frequenza d'uso e possibilità di spostare l'uso;
4. inserire manualmente i dati chiave di una bolletta e associare una copia locale opzionale;
5. dichiarare impianto fotovoltaico, potenza e stima di produzione;
6. visualizzare consumi, costo e confronto tra periodi inseriti;
7. ricevere suggerimenti deterministici basati sui dati disponibili e un potenziale risparmio espresso come intervallo;
8. impostare promemoria locali opzionali (es. lettura contatore, aggiornamento bolletta).

Fuori MVP: riconoscimento OCR automatico delle bollette, integrazione con contatori/smart plug, login, sincronizzazione cloud, condivisione familiare, contratti/fornitori in tempo reale, previsioni tariffarie e automazioni domotiche.

## Architettura applicativa

```text
Expo Router (presentazione)
        │
        ▼
Feature screens / view-models
        │
        ▼
Use case di dominio
  ├── Analisi consumi e suggerimenti
  ├── Gestione bollette e allegati
  ├── Profilo, presenza, apparecchi, FV
  └── Promemoria
        │
        ▼
Repository interfaces
  ├── SQLite repositories ───────► bollettabassa.db
  ├── File repository ───────────► documentDirectory/bills/
  ├── Location adapter ──────────► coordinate/località consensuali
  └── Notifications adapter ─────► pianificazione locale
```

### Struttura futura consigliata

```text
src/
  app/                 # route Expo Router: solo composizione delle schermate
  features/            # una cartella per dominio: bills, appliances, insights…
  domain/              # tipi, regole, use case puri e interfacce repository
  data/
    db/                # apertura DB, migrazioni, query e repository SQLite
    files/             # salvataggio, lettura e cancellazione allegati locali
    device/            # adapter Location e Notifications
  shared/              # UI riusabile, form, formatter, accessibilità
```

Le schermate non devono contenere SQL né chiamare API del dispositivo direttamente. Ogni scrittura passa da un use case, in una transazione quando coinvolge più tabelle; gli allegati sono salvati nel filesystem e nel DB si conserva solo URI, metadati e checksum. Non salvare bollette come BLOB SQLite.

### Dati, privacy e ciclo di vita

- Database: un file `bollettabassa.db`, migrazioni incrementali con `PRAGMA user_version`, `foreign_keys = ON` e WAL.
- File: copie importate nella directory documenti dell'app, con nome generato e mai con il nome originale esposto in UI/log.
- Località: il consenso è richiesto solo quando l'utente abilita meteo o localizzazione; salvare località testuale o coordinate approssimate, non tracciamento continuo.
- Meteo: adapter separato, cache con data di aggiornamento e fallback a inserimento manuale. Se in futuro verrà interrogato un provider, vengono inviati solo dati minimi necessari dopo consenso; i dati dell'utente restano locali.
- Notifiche: esclusivamente locali, con opt-in e un registro per evitare duplicati.
- Backup/export e cancellazione completa devono essere progettati prima del rilascio; cancellare DB e directory allegati nello stesso flusso.

## Schema dati SQLite proposto

Convenzioni: chiavi primarie `INTEGER`, date ISO-8601 UTC in `TEXT`, booleani `INTEGER` (0/1), importi in centesimi (`INTEGER`) per evitare arrotondamenti. Tutte le tabelle operative hanno `created_at` e `updated_at`.

| Tabella | Campi principali | Scopo |
|---|---|---|
| `households` | `id`, `name`, `postal_code`, `city`, `latitude`, `longitude`, `occupants_count`, `area_m2` | Unità domestica e località facoltativa. |
| `presence_schedules` | `id`, `household_id`, `day_of_week`, `start_time`, `end_time`, `presence_type` | Fasce ricorrenti: a casa, fuori, sonno. |
| `appliances` | `id`, `household_id`, `name`, `category`, `power_w`, `energy_class`, `is_shiftable`, `is_active` | Catalogo degli apparecchi dell'utente. |
| `appliance_usage_profiles` | `id`, `appliance_id`, `frequency_per_week`, `minutes_per_use`, `preferred_start`, `constraints_json` | Stima e vincoli d'uso; JSON solo per vincoli evolvibili. |
| `solar_systems` | `id`, `household_id`, `peak_power_kw`, `installation_date`, `orientation`, `tilt_deg`, `has_battery`, `battery_kwh` | Configurazione fotovoltaica. |
| `solar_production_readings` | `id`, `solar_system_id`, `reading_date`, `production_wh`, `source` | Produzione inserita o stimata per giorno/mese. |
| `bills` | `id`, `household_id`, `period_start`, `period_end`, `consumption_kwh`, `total_cents`, `energy_cents`, `fixed_cents`, `taxes_cents`, `supplier_name`, `tariff_name`, `status` | Dati normalizzati della bolletta. |
| `bill_time_bands` | `id`, `bill_id`, `band_code`, `consumption_kwh`, `unit_price_millicents` | Consumi e prezzo per fascia, se disponibili. |
| `bill_documents` | `id`, `bill_id`, `local_uri`, `mime_type`, `file_size`, `checksum`, `imported_at` | Metadati degli allegati salvati localmente. |
| `weather_observations` | `id`, `household_id`, `observed_at`, `temperature_c`, `condition_code`, `source`, `expires_at` | Cache meteo e dato manuale. |
| `insights` | `id`, `household_id`, `kind`, `title`, `explanation`, `estimated_min_cents`, `estimated_max_cents`, `confidence`, `payload_json`, `generated_at`, `dismissed_at` | Suggerimenti riproducibili e loro stato. |
| `notification_preferences` | `id`, `household_id`, `enabled`, `bill_reminder_day`, `meter_reminder_day` | Preferenze dei promemoria locali. |
| `notification_log` | `id`, `kind`, `scheduled_for`, `delivered_at`, `platform_identifier` | Deduplicazione e diagnostica delle notifiche. |

Indici iniziali: `bills(household_id, period_start DESC)`, `solar_production_readings(solar_system_id, reading_date DESC)`, `weather_observations(household_id, observed_at DESC)`, `insights(household_id, dismissed_at, generated_at DESC)` e tutte le chiavi esterne. Le regole di cancellazione devono usare `ON DELETE CASCADE` per dati dipendenti; gli allegati filesystem saranno rimossi esplicitamente prima/durante la cancellazione della bolletta.

## Motore di analisi MVP

Il motore è una funzione pura e testabile che produce `insights` da snapshot dei repository. Regole iniziali:

- stimare kWh apparecchio = `power_w × minutes_per_use × frequenza / 60.000`;
- confrontare l'orario d'uso con fasce/prezzi presenti in bolletta;
- per apparecchi spostabili, proporre una finestra compatibile con presenza e vincoli;
- con FV, privilegiare l'autoconsumo nelle ore di produzione dichiarata/stimata;
- usare meteo solo come contesto (es. ondata di caldo), mai come prova causale;
- indicare `bassa`, `media` o `alta` confidenza in base alla completezza dei dati;
- non emettere risparmi quando mancano i parametri necessari; richiedere il dato mancante.

## Schermate richieste

| Area | Schermata | Obiettivo |
|---|---|---|
| Onboarding | Benvenuto e privacy | Spiegare local-first, raccolta dati e consensi. |
| Onboarding | Casa e presenza | Profilo domestico, località facoltativa, orari ricorrenti. |
| Home | Dashboard | Spesa/consumo dell'ultima bolletta, completezza dati, 1–3 insight prioritari. |
| Bollette | Elenco e dettaglio | Storico, inserimento manuale, fasce e allegato locale. |
| Apparecchi | Elenco e modifica | Censimento, uso, potenza e spostabilità. |
| Fotovoltaico | Configurazione e produzione | Dati impianto e letture/stime. |
| Analisi | Insight e dettaglio | Motivazione, impatto stimato, azione e dati mancanti. |
| Impostazioni | Dati e promemoria | Permessi, notifiche, export/cancellazione e fonti dati. |

## Decisioni da validare prima dell'implementazione

1. Paese e formato tariffario iniziale (lo schema assume mercato italiano e fasce F1/F2/F3 opzionali).
2. Fonte meteo, termini d'uso e comportamento offline; in MVP è preferibile il fallback manuale.
3. Formato import/export e protezione dei backup; SQLite non deve essere trattato automaticamente come cifrato.
4. Metodo di acquisizione bolletta post-MVP: import PDF/immagine prima dell'OCR, con revisione manuale obbligatoria.
