# Netflix Clone - PRD

## Problema Originale
Clone di Netflix con frontend React/TypeScript e backend Python/FastAPI + MongoDB.

## Architettura
```
/app/netflix-clone-react-typescript/
  ├── backend/server.py          # FastAPI backend (auth, TMDB, watch progress)
  ├── src/
  │   ├── config/cdnMapping.ts   # CDN image mapping (94 titoli)
  │   ├── hooks/
  │   │   ├── useCDNImage.ts     # Hook React per immagini CDN
  │   │   └── useContinueWatching.ts  # Hook per "Continua a guardare"
  │   ├── components/
  │   │   ├── ContinueWatchingSection.tsx  # Sezione homepage
  │   │   ├── ContinueWatchingCard.tsx     # Card con barra progresso
  │   │   ├── PlayButton.tsx               # Pulsante play con ripresa
  │   │   ├── VideoCardPortal.tsx          # Card hover con ripresa
  │   │   └── DetailModal.tsx              # Modale dettagli
  │   └── pages/
  │       ├── HomePage.tsx        # Homepage con sezione "Continua a guardare"
  │       ├── WatchPage.tsx       # Player con salvataggio/ripresa automatica
  │       └── DetailPage.tsx      # Pagina dettagli con progresso episodi
  └── scripts/
      └── final_cdn_mapping.py   # Script per generare il mapping CDN
```

## Funzionalità "Continua a Guardare" (Implementata)

### Backend API
- `POST /api/auth/watch-progress` - Salva/aggiorna progresso
- `GET /api/auth/watch-progress` - Lista per utente
- `GET /api/auth/watch-progress/{tmdb_id}` - Progresso specifico
- `DELETE /api/auth/watch-progress/{tmdb_id}` - Rimuovi
- Collection: `watch_progress` con indici su (user_id, tmdb_id)

### Struttura Dati
```json
{
  "user_id": "uuid",
  "tmdb_id": 123456,
  "media_type": "movie|tv",
  "progress": 1850,
  "duration": 7200,
  "title": "...",
  "backdrop_path": "...",
  "poster_path": "...",
  "season": 1,
  "episode": 3,
  "updated_at": "ISO timestamp"
}
```

### Regole
- Salvataggio ogni 30 secondi + al unmount/beforeunload
- Progresso < 30s ignorato
- Completamento automatico al >95% (rimosso dalla lista)
- Persistenza per utente (backend MongoDB per loggati, localStorage fallback)
- Ripresa dal punto esatto con parametro `?t=<seconds>` → VixSrc `startAt`

## CDN Mapping (Implementato)
- 94 titoli mappati con ID TMDB verificati
- Copertura: Trending 93%, Now Playing 94%, Popular Movies 89%
- Struttura: poster==backdrop, detail_backdrop dalla pagina dettaglio

## Implementato
- [Mar 2026] "Continua a guardare": backend API + frontend hook + sezione homepage + salvataggio/ripresa automatica
- [Mar 2026] cdnMapping.ts con 94 titoli e ID TMDB corretti

## Backlog
- P1: Risolvere errore SSL MongoDB Atlas (per ambiente utente)
- P2: Pulizia requirements.txt
- P3: Aggiornamento periodico mapping CDN
