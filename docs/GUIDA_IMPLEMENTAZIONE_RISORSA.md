## Guida pratica: creare la prima risorsa multisito (con ruoli e permessi)

Questa guida spiega come aggiungere una nuova risorsa al CMS (es. "Categorie") seguendo i principi e i pattern dell'architettura, con supporto multisito, ruoli/permessi, sidebar dinamica e protezione delle rotte. La guida è operativa, senza codice implementativo, e fa riferimento ai file già presenti nel repo.

### Obiettivi
- **Multisito**: ogni risorsa appartiene a uno specifico sito; tutte le API includono l'header `X-Site` e le UI si contestualizzano al sito selezionato.
- **Autorizzazioni**: visibilità e azioni basate su ruoli/permessi utente.
- **Navigazione**: la sidebar mostra solo le voci consentite.
- **Protezione**: le rotte sono protette sia a livello di middleware che di componenti.

### Prerequisiti
- Utente autenticato con token gestito da `zustand` (`src/stores/auth-store.ts`).
- Sito selezionato in `useAuthStore.selectedSite` (il client API aggiunge in automatico `X-Site`).
- Endpoint base configurato in `src/config/endpoints.ts` e rotte interne in `src/config/routes.ts`.

---

### 1) Definizione della risorsa
Prima di tutto, definisci il dominio della risorsa che vuoi introdurre (es. Categorie):
- **Identità**: id, nome, slug, descrizione, timestamps.
- **Scoping**: ogni entità è legata a un sito (implicitamente via header `X-Site`).
- **Vincoli**: unicità per sito (es. slug univoco per sito), limiti di lunghezza.
- **Permessi base**: `create`, `read`, `update`, `delete` (eventualmente `publish` o `manage` se utile).

Output di questa fase: un documento breve con il modello dati concettuale e le azioni consentite.

---

### 2) Contract API e regole di integrazione
Stabilisci il contract API REST per la risorsa, coerente con `/api/v1` e con l'header multisito:
- Base path tipico: `/sites/:siteId/<risorsa>` lato backend; lato frontend usiamo header `X-Site` e path semplificati.
- Endpoints minimi:
  - `GET /<risorsa>`: lista paginata/filtrabile
  - `POST /<risorsa>`: crea
  - `GET /<risorsa>/:id`: dettaglio
  - `PUT /<risorsa>/:id`: aggiorna
  - `DELETE /<risorsa>/:id`: elimina
- Regole comuni:
  - Ogni richiesta include `Authorization: Bearer <token>` e `X-Site: <siteId>` (gestito da `api` e `useAuthStore`).
  - Errori mappati in `ApiError` sono già tradotti lato client (vedi `src/lib/api.ts`).
  - Paginazione e filtri: definire parametri (es. `page`, `per_page`, `q`, ecc.).
  - Contratto di paginazione: la risposta dei listati espone sempre i campi
    - `current_page`: numero pagina corrente (es. 1)
    - `per_page`: elementi per pagina (es. 15)
    - `total`: numero totale elementi (es. 165)
    - `last_page`: ultima pagina disponibile (es. 11)
    - Dato questo contratto, il client deve propagare i parametri di query `page` e `per_page` nelle richieste.

Output: elenco chiaro degli endpoint e dei parametri supportati.

---

### 3) Configurazione applicativa (endpoints e rotte)
Aggiorna le configurazioni centralizzate:
- `src/config/endpoints.ts`
  - Aggiungi il gruppo `RESOURCE_NAME` con le stringhe endpoint essenziali (lista, create, detail, update, delete).
  - Mantieni i nomi coerenti e piatti (es. `CATEGORIES: { LIST: '/categories', DETAIL: (id) => "/categories/"+id, ... }`).
- `src/config/routes.ts`
  - Aggiungi rotte interne per UI: sotto `APP_ROUTES.DASHBOARD` prevedi dettagli per `'/dashboard/sites/:siteId/<risorsa>'` con pagine `list`, `new`, `detail`/`edit`.
  - Aggiorna `ROUTE_PERMISSIONS` mappando le rotte di primo livello della risorsa ai permessi richiesti (es. `'/dashboard/sites': ['manage_sites']` è l’esempio esistente; aggiungi la tua chiave).

Nota: la validazione dinamica degli ID (UUID/numerico) è gestita dai helper già presenti in `routes.ts` per breadcrumb/labeling.

---

### 4) Permessi e ruoli (policy di accesso)
Definisci la policy della risorsa:
- Azioni consentite per ruolo (es. `viewer: read`, `editor: read+create+update (own)`, `site_admin: manage`, `super_admin: manage`).
- Seleziona la stringa permesso coerente con lo schema in uso (es. `manage_<risorsa>`, `read_<risorsa>`, ecc.).
- Integra nella logica:
  - Sidebar: mostrare la voce solo se l’utente possiede almeno il permesso di `read` sulla risorsa per il sito corrente.
  - Rotte: aggiungi la rotta principale della risorsa a `ROUTE_PERMISSIONS` con l’elenco dei permessi richiesti (anche uno solo è sufficiente).

Suggerimento: usa un’unica fonte di verità dei permessi (i permessi dell’utente arrivano da `useAuth().userPermissions`).

---

### 5) Protezione delle rotte
Applica protezioni a più livelli:
- Middleware (`src/middleware.ts`):
  - Intercetta percorsi sotto `'/dashboard'` e verifica presenza del token.
  - Opzionale: ridirigi a `APP_ROUTES.AUTH.LOGIN` se non autenticato.
- Protezione a livello di componenti (Route/Permission Guard):
  - Prima di renderizzare le pagine della risorsa, verifica che l’utente abbia i permessi necessari e l’accesso al sito selezionato.
  - In caso negativo, mostra fallback coerente (accesso negato) o redirect.

Nota: la logica multisito viene dal `selectedSite` in `useAuthStore`; il client API allega `X-Site` automaticamente.

---

### 6) UI/UX: struttura pagine e navigazione
Organizza le pagine App Router sotto il sito corrente:
- Struttura consigliata in `src/app/(dashboard)/sites/[siteId]/<risorsa>/`:
  - `page.tsx`: lista
  - `new/page.tsx`: creazione
  - `[id]/page.tsx`: dettaglio/modifica
- Navigazione/Sidebar (`src/components/layout/sidebar.tsx`):
  - Aggiungi una voce per la risorsa con `href` puntato alla lista della risorsa per il `siteId` corrente.
  - Mostra la voce solo se l’utente ha permesso minimo di `read`.
- Breadcrumbs: i label sono generati dalle utility di `routes.ts`; mantieni segmenti parlanti (es. `categories`, `new`, `edit`).

---

### 7) Hooks e stato
Per l’accesso ai dati, utilizza il client API centralizzato `src/lib/api.ts`:
- Crea hook dedicati (nomenclatura suggerita):
  - `use<Resource>` per la lista/dettagli
  - `useCreate<Resource>`, `useUpdate<Resource>`, `useDelete<Resource>` per le mutazioni
- Ogni chiamata alle API sarà automaticamente contestualizzata al sito via header `X-Site` (già gestito da `api` + `useAuthStore`).
- Gestisci loading/error UI con pattern esistenti (vedi `useApiError`).

Nota: il progetto non usa React Query al momento; mantieni coerenza con gli hook/gestione stato esistenti o introducilo in modo incrementale e coerente se/quando necessario.

---

### 8) Sidebar dinamica (visibilità per permessi e sito)
Regole operative per mostrare la voce della risorsa:
- L’utente deve essere autenticato e avere un `selectedSite` valido.
- Deve possedere almeno il permesso di lettura della risorsa per quel sito.
- La voce deve attivarsi (stato attivo) in base al `pathname` corrente; usa gli helper già in uso in `sidebar.tsx` e `routes.ts`.

Suggerimento: centralizza in un piccolo selettore/utility la condizione di visibilità della risorsa per evitare logica duplicata tra sidebar e pagine.

---

### 9) Validazione, errori e DX
- Input: convalida al submit usando gli schemi di validazione del progetto (se presenti) o regole coerenti (min/max, required, ecc.).
- Errori API: sono già normalizzati da `ApiError`. Mostra feedback all’utente con i messaggi mappati.
- Edge cases: mancanza di `selectedSite`, permessi insufficienti, rete offline; prevedi messaggi chiari.

---

### 10) Test e controlli
- Unit test: per le funzioni di guardia permessi e per gli helper di routing.
- UI test: per la visibilità condizionale della voce in sidebar e bottoni azione della risorsa.
- Smoke test: navigazione lista → dettaglio → creazione → aggiornamento → cancellazione (con utente con permessi adeguati).

Checklist PR:
- [ ] Endpoints aggiunti in `src/config/endpoints.ts`
- [ ] Rotte aggiunte in `src/config/routes.ts` e `ROUTE_PERMISSIONS` aggiornato
- [ ] Pagine App Router create sotto `sites/[siteId]/<risorsa>`
- [ ] Sidebar aggiornata con visibilità per permessi/sito
- [ ] Guard di rotta e/o componenti aggiornati (middleware + guard component)
- [ ] Hook di accesso dati creati e collegati a `api`
- [ ] Stati di loading/errore gestiti
- [ ] Test minimi presenti

---

### 11) Esempio concettuale: "Categorie"
Esempio di scelte concrete (senza codice):
- Nome risorsa: Categorie (`categories`).
- Permesso minimo: `read_categories` per visibilità; `manage_categories` per creazione/modifica/eliminazione.
- Endpoints: `/categories`, `/categories/:id`, e endpoint di ricerca con filtri `/categories/search`.
- Ricerca: supporta query params `page`, `per_page`, `search`, `parent_id`. La risposta include `data` (array categorie) e i metadati di paginazione (`current_page`, `per_page`, `total`, `last_page`).
- Rotte UI: `'/dashboard/sites/:siteId/categories'`, `'/dashboard/sites/:siteId/categories/new'`, `'/dashboard/sites/:siteId/categories/:id'`.
- Sidebar: voce "Categorie" visibile se l’utente ha `read_categories` sul sito selezionato.
- Guard: l’accesso alle pagine `new`/`edit` richiede `manage_categories`.

Vincoli aggiuntivi richiesti:
- Azioni: mostrare tasti "Modifica" e "Delete" nella lista/dettaglio.
- Delete: impedito se la categoria ha almeno 1 articolo collegato (es. `articles_count > 0`); in tal caso mostrare un errore user-friendly (toast) e non inviare la richiesta di cancellazione.
- Visibilità multisito: questa risorsa è disponibile solo per il sito con id `editoria` (vedi `src/data/sites.json`). La voce in sidebar e le pagine devono essere mostrate/attive esclusivamente quando `selectedSite === 'editoria'`.

---

### Note importanti
- Il client `api` imposta automaticamente `Authorization` e `X-Site` quando `token` e `selectedSite` sono presenti (vedi `src/lib/api.ts` e `src/stores/auth-store.ts`).
- Mantenere i nomi coerenti tra endpoint, rotte e permessi facilita manutenzione e onboarding.
- Evitare duplicazioni di logica di permessi: centralizzare il controllo e riutilizzarlo in sidebar, guard di rotta e componenti.


