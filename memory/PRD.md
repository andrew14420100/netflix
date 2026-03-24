# Netflix Clone - PRD

## Problema Originale
Clone di Netflix con frontend React/TypeScript e backend Python/FastAPI + MongoDB Atlas.
Task principale: popolare il file `cdnMapping.ts` con immagini da `streamingcommunityz.ninja` per coprire TUTTI i contenuti della homepage.

## Struttura cdnMapping.ts
```js
TMDB_ID: {
  poster: "POSTER_UUID",      // Cover UUID da StreamingCommunity
  backdrop: "POSTER_UUID",     // Identico al poster
  detail_backdrop: "BG_UUID"   // Background UUID dalla pagina dettaglio
}
```
- CDN Base: `https://cdn.streamingcommunityz.ninja/images/`
- Le chiavi sono TMDB ID (usati dal backend per fetch trending/popular)
- Il frontend ha fallback su immagini TMDB se l'ID non è nel mapping

## Architettura
```
/app/netflix-clone-react-typescript/
  ├── backend/server.py          # FastAPI - fetches TMDB trending/popular/now_playing
  ├── src/config/cdnMapping.ts   # CDN image mapping (94 titoli)
  ├── src/hooks/useCDNImage.ts   # Hook React per immagini CDN (con fallback TMDB)
  └── scripts/
      ├── final_cdn_mapping.py   # Script per generare il mapping completo
      └── cdn_mapping_data.json  # Dati di riferimento
```

## Homepage Endpoints
- `/api/public/homepage/trending` -> TMDB trending/all/week
- `/api/public/homepage/latest` -> TMDB now_playing + on_the_air
- `/api/public/top10` -> Top 10 dal database

## Implementato
- [Feb 2026] cdnMapping.ts con 94 titoli, ID TMDB verificati
- [Feb 2026] Copertura homepage: Trending 93%, Now Playing 94%, Popular Movies 89%
- [Feb 2026] Script automatico che: (1) fetch TMDB IDs, (2) cerca SC trending, (3) match CDN images
- [Feb 2026] Tutte le regole rispettate: poster==backdrop, detail_backdrop dalla pagina dettaglio, no backslash

## Issue Note
- **MongoDB SSL**: Backend ha problemi SSL con MongoDB Atlas (in pausa)
- **Titoli non trovati**: 10 titoli in lingue straniere/talk show non su SC (fallback TMDB)

## Backlog
- P1: Risolvere errore SSL MongoDB Atlas
- P2: Pulizia requirements.txt
- P3: Aggiornamento periodico mapping quando cambiano i trending
