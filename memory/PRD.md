# Netflix Clone - PRD

## Problema Originale
Clone di Netflix con frontend React/TypeScript e backend Python/FastAPI + MongoDB.

## Architettura
```
/app/netflix-clone-react-typescript/
  ├── backend/server.py          # FastAPI (auth, TMDB, watch progress, profile)
  ├── src/
  │   ├── config/cdnMapping.ts   # CDN image mapping (94 titoli)
  │   ├── hooks/
  │   │   ├── useCDNImage.ts
  │   │   └── useContinueWatching.ts
  │   ├── components/
  │   │   ├── layouts/MainHeader.tsx  # Navbar con avatar dropdown moderno
  │   │   ├── ContinueWatchingSection.tsx
  │   │   ├── ContinueWatchingCard.tsx
  │   │   ├── PlayButton.tsx
  │   │   ├── VideoCardPortal.tsx
  │   │   └── DetailModal.tsx
  │   └── pages/
  │       ├── HomePage.tsx
  │       ├── AccountPage.tsx     # Pagina account modernizzata
  │       ├── WatchPage.tsx
  │       └── DetailPage.tsx
```

## Implementato
- [Mar 2026] cdnMapping.ts con 94 titoli, ID TMDB verificati
- [Mar 2026] "Continua a guardare": backend API + frontend + homepage section
- [Mar 2026] Pagina Account modernizzata: profilo, continua a guardare, impostazioni
- [Mar 2026] Avatar circolare con dropdown menu nel MainHeader
- [Mar 2026] Selezione avatar con colori (8 opzioni)
- [Mar 2026] Cambio nome, email, password dall'account
- [Mar 2026] Eliminazione account + logout
- [Mar 2026] Login/Registrazione integrata nella pagina account

## Backlog
- P1: Risolvere errore SSL MongoDB Atlas (per ambiente utente)
- P2: Pulizia requirements.txt
- P3: Aggiornamento periodico mapping CDN
