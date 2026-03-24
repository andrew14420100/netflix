# Netflix Clone - PRD

## Problema Originale
Clone di Netflix con frontend React/TypeScript e backend Python/FastAPI + MongoDB Atlas.
Task principale: popolare il file `cdnMapping.ts` con immagini scrappate da `streamingcommunityz.ninja`.

## Struttura cdnMapping.ts
- Chiave: TMDB ID
- `poster`: UUID del poster CDN
- `backdrop`: identico al poster
- `detail_backdrop`: UUID dalla pagina dettaglio (background min-width:800px)
- CDN Base: `https://cdn.streamingcommunityz.ninja/images/`

## Architettura
```
/app/netflix-clone-react-typescript/
  ├── backend/server.py          # FastAPI backend
  ├── src/config/cdnMapping.ts   # CDN image mapping (51 titoli)
  ├── src/hooks/useCDNImage.ts   # Hook React per immagini CDN
  └── scripts/fix_cdn_mapping.py # Script per aggiornare il mapping
```

## Implementato
- [Feb 2026] cdnMapping.ts con 51 titoli, struttura corretta
- [Feb 2026] Script automatico per cercare titoli via API e ottenere detail_backdrop
- [Feb 2026] Correzione 44 voci con detail_backdrop mancante (era uguale al poster)
- [Feb 2026] Verifica: nessun backslash, poster==backdrop, detail_backdrop unico per tutte le voci

## Issue Note
- **MongoDB SSL**: Backend ha problemi SSL con MongoDB Atlas (non risolto, in pausa)
- **Hollywood Party / Grand Prix**: Non hanno corrispondenza esatta sul sito, usate approssimazioni
- **requirements.txt**: Contiene `emergentintegrations` non disponibile su PyPI

## Backlog
- P1: Risolvere errore SSL MongoDB Atlas
- P2: Aggiungere nuovi titoli al mapping
- P2: Pulizia requirements.txt
- P3: Script riutilizzabile per aggiornamenti automatici del mapping
