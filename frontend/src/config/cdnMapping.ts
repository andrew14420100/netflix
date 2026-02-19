/**
 * Mapping tra TMDB ID e Streaming Community CDN Image ID
 * 
 * CDN Base URL: https://cdn.streamingunity-premium.to/images/
 * 
 * Per aggiungere nuove immagini:
 * 1. Trova l'ID TMDB del film/serie
 * 2. Trova l'ID immagine dalla CDN di Streaming Community
 * 3. Aggiungi la mappatura qui sotto
 * 
 * Formato: [TMDB_ID]: { poster?: "image-id", backdrop?: "image-id" }
 */

export const CDN_BASE_URL = "https://cdn.streamingunity-premium.to/images/";

// Tipo per il mapping
export interface CDNImageMapping {
  poster?: string;           // ID per il poster (verticale)
  backdrop?: string;         // ID per il backdrop home (orizzontale, hero section)
  detail_backdrop?: string;  // ID per il backdrop pagina dettaglio (opzionale, fallback a backdrop)
}

// Mapping TMDB ID -> CDN Image IDs
// Puoi aggiungere sia film che serie TV
export const cdnImageMapping: Record<number, CDNImageMapping> = {
  // === SERIE TV ===
  
  // Zotropolis 2 (TMDB ID: 1396)
  1084242: {
    poster: "af597395-bdb2-4bce-a881-bc37b67fc8e2",
    backdrop: "af597395-bdb2-4bce-a881-bc37b67fc8e2",
    detail_backdrop: "d31f6a8c-e851-4653-8ff7-d7f75c74c38f"  // Stesso o diverso per dettaglio
  },
  
  // Bridgerton (TMDB ID: 91239) - Hero della home
  91239: {
    poster: "106ca68f-a3d2-4492-bf81-6caf5efac9b3",
    backdrop: "106ca68f-a3d2-4492-bf81-6caf5efac9b3",           // Per la HOME (Hero)
    detail_backdrop: "106ca68f-a3d2-4492-bf81-6caf5efac9b3"     // Per la PAGINA DETTAGLIO (può essere diverso)
  },
  
  // Game of Thrones (TMDB ID: 1399)
  1306368: {
    poster: "39380f3f-5f2e-48aa-9f5c-8144abd943ec",
    backdrop: "39380f3f-5f2e-48aa-9f5c-8144abd943ec"
    // detail_backdrop non specificato -> usa backdrop come fallback
  },
  
  // Stranger Things (TMDB ID: 66732)
  48981: {
    poster: "79da709c-4898-4432-ad70-f4a30d48b93e",
    backdrop: "79da709c-4898-4432-ad70-f4a30d48b93e"
  },
  
  // Anaconda (TMDB ID: 71912)
  1234731: {
    poster: "03328e19-58f4-43f9-b9b2-06b4e90fb543",
    backdrop: "79da709c-4898-4432-ad70-f4a30d48b93e",
    detail_backdrop: "84f775e5-5c21-4589-83d0-a48ee68865e3"
  },
  
  // Squid Game (TMDB ID: 93405)
  93405: {
    poster: "93405-squid-game-poster",
    backdrop: "93405-squid-game-backdrop"
  },
  
  // Money Heist / La Casa de Papel (TMDB ID: 71446)
  71446: {
    poster: "71446-money-heist-poster",
    backdrop: "71446-money-heist-backdrop"
  },
  
  // Wednesday (TMDB ID: 119051)
  119051: {
    poster: "119051-wednesday-poster",
    backdrop: "119051-wednesday-backdrop"
  },
  
  // The Last of Us (TMDB ID: 100088)
  100088: {
    poster: "100088-tlou-poster",
    backdrop: "100088-tlou-backdrop"
  },
  
  // Peaky Blinders (TMDB ID: 60574)
  60574: {
    poster: "60574-peaky-blinders-poster",
    backdrop: "60574-peaky-blinders-backdrop"
  },
  
  // The Crown (TMDB ID: 65494)
  65494: {
    poster: "65494-crown-poster",
    backdrop: "65494-crown-backdrop"
  },
  
  // Dark (TMDB ID: 70523)
  70523: {
    poster: "70523-dark-poster",
    backdrop: "70523-dark-backdrop"
  },
  
  // Arcane (TMDB ID: 94605)
  94605: {
    poster: "94605-arcane-poster",
    backdrop: "94605-arcane-backdrop"
  },
  
  // === FILM ===
  
  // Inception (TMDB ID: 27205)
  27205: {
    poster: "27205-inception-poster",
    backdrop: "27205-inception-backdrop"
  },
  
  // The Dark Knight (TMDB ID: 155)
  155: {
    poster: "155-dark-knight-poster",
    backdrop: "155-dark-knight-backdrop"
  },
  
  // Interstellar (TMDB ID: 157336)
  157336: {
    poster: "157336-interstellar-poster",
    backdrop: "157336-interstellar-backdrop"
  },
  
  // Oppenheimer (TMDB ID: 872585)
  872585: {
    poster: "872585-oppenheimer-poster",
    backdrop: "872585-oppenheimer-backdrop"
  },
  
  // Dune (TMDB ID: 438631)
  438631: {
    poster: "438631-dune-poster",
    backdrop: "438631-dune-backdrop"
  },
  
  // Avatar (TMDB ID: 19995)
  19995: {
    poster: "19995-avatar-poster",
    backdrop: "19995-avatar-backdrop"
  },
  
  // The Matrix (TMDB ID: 603)
  603: {
    poster: "603-matrix-poster",
    backdrop: "603-matrix-backdrop"
  },
  
  // Pulp Fiction (TMDB ID: 680)
  680: {
    poster: "680-pulp-fiction-poster",
    backdrop: "680-pulp-fiction-backdrop"
  },
  
  // Fight Club (TMDB ID: 550)
  550: {
    poster: "550-fight-club-poster",
    backdrop: "550-fight-club-backdrop"
  },
  
  // The Shawshank Redemption (TMDB ID: 278)
  278: {
    poster: "278-shawshank-poster",
    backdrop: "278-shawshank-backdrop"
  },
  
  // Gladiator (TMDB ID: 98)
  98: {
    poster: "98-gladiator-poster",
    backdrop: "98-gladiator-backdrop"
  },
  
  // Joker (TMDB ID: 475557)
  475557: {
    poster: "475557-joker-poster",
    backdrop: "475557-joker-backdrop"
  },
  
  // Parasite (TMDB ID: 496243)
  496243: {
    poster: "496243-parasite-poster",
    backdrop: "496243-parasite-backdrop"
  },
  
  // Spider-Man: No Way Home (TMDB ID: 634649)
  634649: {
    poster: "634649-spiderman-poster",
    backdrop: "634649-spiderman-backdrop"
  },
  
  // Top Gun: Maverick (TMDB ID: 361743)
  361743: {
    poster: "361743-topgun-poster",
    backdrop: "361743-topgun-backdrop"
  },
};

/**
 * Ottiene l'URL completo dell'immagine dalla CDN di Streaming Community
 * @param tmdbId - ID del film/serie su TMDB
 * @param type - Tipo di immagine ('poster', 'backdrop' o 'detail_backdrop')
 * @returns URL completo dell'immagine CDN o null se non trovato
 */
export function getCDNImageUrl(tmdbId: number, type: 'poster' | 'backdrop' | 'detail_backdrop'): string | null {
  const mapping = cdnImageMapping[tmdbId];
  if (!mapping) return null;
  
  // Per detail_backdrop, usa quello specifico se esiste, altrimenti fallback a backdrop
  let imageId: string | undefined;
  if (type === 'detail_backdrop') {
    imageId = mapping.detail_backdrop || mapping.backdrop;
  } else {
    imageId = mapping[type];
  }
  
  if (!imageId) return null;
  
  // Aggiungi estensione .webp se non presente
  const fullId = imageId.endsWith('.webp') ? imageId : `${imageId}.webp`;
  return `${CDN_BASE_URL}${fullId}`;
}

/**
 * Verifica se un TMDB ID ha un mapping CDN disponibile
 * @param tmdbId - ID del film/serie su TMDB
 * @returns true se esiste un mapping
 */
export function hasCDNMapping(tmdbId: number): boolean {
  return tmdbId in cdnImageMapping;
}

/**
 * Ottiene l'URL dell'immagine: prima prova CDN, poi fallback a TMDB
 * @param tmdbId - ID del film/serie su TMDB
 * @param type - Tipo di immagine ('poster', 'backdrop' o 'detail_backdrop')
 * @param tmdbPath - Path dell'immagine TMDB (es. /abc123.jpg)
 * @param tmdbBaseUrl - Base URL di TMDB (es. https://image.tmdb.org/t/p/)
 * @param tmdbSize - Dimensione TMDB (es. w500, original)
 * @returns URL dell'immagine (CDN se disponibile, altrimenti TMDB)
 */
export function getImageUrl(
  tmdbId: number,
  type: 'poster' | 'backdrop' | 'detail_backdrop',
  tmdbPath: string | null,
  tmdbBaseUrl: string = 'https://image.tmdb.org/t/p/',
  tmdbSize: string = 'w500'
): string {
  // Prima prova la CDN
  const cdnUrl = getCDNImageUrl(tmdbId, type);
  if (cdnUrl) {
    return cdnUrl;
  }
  
  // Fallback a TMDB
  if (tmdbPath) {
    return `${tmdbBaseUrl}${tmdbSize}${tmdbPath}`;
  }
  
  // Placeholder se non c'è nulla
  return '/placeholder.jpg';
}
