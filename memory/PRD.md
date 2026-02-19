# Netflix Clone - Product Requirements Document

## Original Problem Statement
Netflix-clone application with the following requirements:
1. **Slow Homepage Hero** - Hero section optimization for instant loading
2. **Eliminate Anime Content** - Filter out anime (genre ID 16, Japan) permanently 
3. **Deterministic Content** - Structured, ordered content based on real TMDB data
4. **Image Update Issue** - Card images should load immediately, not on hover
5. **Card Hover Animation** - Smooth, fluid animations matching reference site
6. **Trailer on Hover** - 6-second delay before trailer autoplay
7. **"Continua a guardare" (Continue Watching)** - Personalized section with resume functionality

## User Language
Italian (Italiano)

## Tech Stack
- **Frontend**: React, TypeScript, Vite, MUI, styled-components, react-query, framer-motion, react-slick
- **Backend**: Python, FastAPI
- **Database**: MongoDB (implicit)
- **External APIs**: TMDB API, VixSrc player

## Architecture
```
/app
├── backend/
│   └── server/main.py      # FastAPI with anime filter
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ContinueWatchingSection.tsx
│   │   │   ├── ContinueWatchingCard.tsx
│   │   │   ├── VideoCardPortal.tsx
│   │   │   ├── VideoItemWithHover.tsx
│   │   │   └── HeroSection.tsx
│   │   ├── hooks/
│   │   │   ├── useContinueWatching.ts
│   │   │   └── useCDNImage.ts
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── WatchPage.tsx
│   │   └── types/Movie.ts
```

## What's Been Implemented

### 2024-02-19: Continue Watching Feature
**Status**: ✅ COMPLETE

Implemented features:
1. **ContinueWatchingSection.tsx** - Renders "[Username], continua a guardare:" section
2. **ContinueWatchingCard.tsx** - Cards with progress bar, passes resumeInfo to portal
3. **VideoCardPortal.tsx** - Shows TMDB logo instead of title, trailer after 6s, resume navigation
4. **WatchPage.tsx** - Handles `?t=` parameter, passes `startAt` to VixSrc player
5. **useContinueWatching.ts** - Manages localStorage data for continue watching items
6. **Movie.ts** - Added `resumeInfo` type for resume playback data

Test Results (All PASSED):
- Section renders with localStorage data
- Progress bars visible (#e50914 red)
- Logo shows on hover instead of title
- Trailer loads after 6 second delay
- Play button navigates with ?t= resume param
- VixSrc receives startAt for movies
- VixSrc receives startAt for TV shows with season/episode

### Previously Implemented
- Backend anime filter (genre 16 + language ja)
- React-query client-side caching for hero section
- Deterministic content sorting

## Remaining Tasks

### P1: Card Hover Animation
- Animation not matching reference site `streamingcommunityz.name`
- Needs smoother transitions between cards

### P2: General Polish
- Card styling refinements
- Animation timing improvements

## Key API Endpoints
- `/api/public/contents/home` - Homepage content
- `/api/public/trending/{media_type}` - Trending content
- `/api/public/{media_type}/popular` - Popular content
- `/api/public/{media_type}/top_rated` - Top-rated content

## LocalStorage Keys
- `netflix_continue_watching` - Array of ContinueWatchingItem
- `netflix_username` - User display name

## Reference Sites
- `streamingcommunityz.name` - For card hover animations
- `streamingcommunityz.motorcycles` - For content structure
