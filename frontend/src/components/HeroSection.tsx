import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

import { getRandomNumber } from "src/utils/common";
import MaxLineTypography from "./MaxLineTypography";
import PlayButton from "./PlayButton";
import MoreInfoButton from "./MoreInfoButton";
import NetflixIconButton from "./NetflixIconButton";
import MaturityRate from "./MaturityRate";
import useOffSetTop from "src/hooks/useOffSetTop";
import { MEDIA_TYPE } from "src/types/Common";
import {
  useGetAppendedVideosQuery,
  useGetMediaImagesQuery,
  useGetAllVideosQuery,
} from "src/store/slices/discover";
import VideoJSPlayer, { VideoJSPlayerRef } from "./watch/VideoJSPlayer";

// Default fallback
const DEFAULT_FEATURED_ID = 202208;
const DEFAULT_FEATURED_TYPE = MEDIA_TYPE.Tv;

interface HeroSettings {
  contentId: string;
  customTitle: string | null;
  customDescription: string | null;
  customBackdrop: string | null;
  seasonLabel: string | null;
}

interface TopTrailerProps {
  mediaType: MEDIA_TYPE;
}

// ✅ OPTIMIZED: Fetch hero settings from backend with proper caching (NO cache-busting)
const fetchHeroSettings = async (): Promise<{ hero: HeroSettings | null; type: 'movie' | 'tv' }> => {
  try {
    // Let browser cache work - improves performance on navigation back
    const response = await fetch(`/api/public/hero`, {
      cache: 'default', // Browser will cache for better performance
    });
    if (!response.ok) return { hero: null, type: 'tv' };
    const data = await response.json();
    
    if (data && data.contentId) {
      // Use mediaType directly from hero settings (no extra API call needed)
      return { hero: data, type: data.mediaType || 'tv' };
    }
    return { hero: null, type: 'tv' };
  } catch {
    return { hero: null, type: 'tv' };
  }
};

// Helper function to get Italian trailer key with priority
const getItalianTrailerKey = (detailVideos: any[], allVideos: any[]): string | null => {
  const videoMap = new Map<string, any>();
  [...(detailVideos || []), ...(allVideos || [])].forEach(v => {
    if (v.site === "YouTube" && v.key) {
      videoMap.set(v.key, v);
    }
  });
  const videos = Array.from(videoMap.values());
  
  if (!videos.length) return null;
  
  const italianTrailer = videos.find((v: any) => v.iso_639_1 === "it" && v.type === "Trailer");
  if (italianTrailer) return italianTrailer.key;
  
  const italianTeaser = videos.find((v: any) => v.iso_639_1 === "it" && v.type === "Teaser");
  if (italianTeaser) return italianTeaser.key;
  
  const italianVideo = videos.find((v: any) => v.iso_639_1 === "it");
  if (italianVideo) return italianVideo.key;
  
  const englishTrailer = videos.find((v: any) => v.iso_639_1 === "en" && v.type === "Trailer");
  if (englishTrailer) return englishTrailer.key;
  
  const anyTrailer = videos.find((v: any) => v.type === "Trailer");
  if (anyTrailer) return anyTrailer.key;
  
  return videos[0]?.key || null;
};

export default function TopTrailer({ mediaType }: TopTrailerProps) {
  const navigate = useNavigate();
  
  // State for dynamic hero
  const [heroSettings, setHeroSettings] = useState<HeroSettings | null>(null);
  const [heroType, setHeroType] = useState<'movie' | 'tv'>('tv');
  const [heroLoaded, setHeroLoaded] = useState(false);
  
  // Load hero settings from backend
  useEffect(() => {
    const loadHero = async () => {
      const { hero, type } = await fetchHeroSettings();
      setHeroSettings(hero);
      setHeroType(type);
      setHeroLoaded(true);
    };
    loadHero();
  }, []);
  
  // Determine featured ID and type - only use loaded values
  const featuredId = heroLoaded && heroSettings?.contentId 
    ? parseInt(heroSettings.contentId) 
    : (heroLoaded ? DEFAULT_FEATURED_ID : 0);
  const featuredMediaType = heroLoaded && heroSettings?.contentId 
    ? (heroType === 'movie' ? MEDIA_TYPE.Movie : MEDIA_TYPE.Tv)
    : DEFAULT_FEATURED_TYPE;
  
  // Skip queries until hero is loaded and we have a valid ID
  const skipQueries = !heroLoaded || featuredId === 0;
  
  const { data: detailData } = useGetAppendedVideosQuery({
    mediaType: featuredMediaType,
    id: featuredId,
  }, { skip: skipQueries });
  
  const { data: allVideosData } = useGetAllVideosQuery({
    mediaType: featuredMediaType,
    id: featuredId,
  }, { skip: skipQueries });
  
  const { data: imagesData } = useGetMediaImagesQuery({
    mediaType: featuredMediaType,
    id: featuredId,
  }, { skip: skipQueries });
  
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const playerRef = useRef<VideoJSPlayerRef | null>(null);
  const isOffset = useOffSetTop(window.innerWidth * 0.5625);
  
  const maturityRate = useMemo(() => getRandomNumber(20), []);
  
  const trailerKey = useMemo(() => {
    const key = getItalianTrailerKey(
      detailData?.videos?.results || [],
      allVideosData?.results || []
    );
    return key;
  }, [detailData?.videos?.results, allVideosData?.results]);
  
  // Get logo from TMDB
  const logoPath = useMemo(() => {
    if (imagesData?.logos && imagesData.logos.length > 0) {
      const italianLogo = imagesData.logos.find((l: any) => l.iso_639_1 === 'it');
      const englishLogo = imagesData.logos.find((l: any) => l.iso_639_1 === 'en');
      const logo = italianLogo || englishLogo || imagesData.logos[0];
      return `https://image.tmdb.org/t/p/w500${logo.file_path}`;
    }
    return null;
  }, [imagesData]);
  
  // Get backdrop URL (custom or TMDB)
  const backdropUrl = useMemo(() => {
    if (heroSettings?.customBackdrop) {
      return heroSettings.customBackdrop;
    }
    if (detailData?.backdrop_path) {
      return `https://image.tmdb.org/t/p/original${detailData.backdrop_path}`;
    }
    return null;
  }, [heroSettings?.customBackdrop, detailData?.backdrop_path]);
  
  // Get title and description (custom or from TMDB)
  const displayTitle = heroSettings?.customTitle || detailData?.name || detailData?.title || '';
  const displayDescription = heroSettings?.customDescription || detailData?.overview || '';
  const seasonLabel = heroSettings?.seasonLabel;

  // Show image for 6 seconds before starting the trailer
  useEffect(() => {
    const timer = setTimeout(() => {
      setVideoReady(true);
      setShowVideo(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Handle video ending - fade back to image
  const handleVideoEnded = useCallback(() => {
    setVideoEnded(true);
    setShowVideo(false);
  }, []);

  // Handle time update - fade out 3 seconds before video ends
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (duration > 0 && currentTime > 0 && (duration - currentTime) <= 3 && !videoEnded) {
      setVideoEnded(true);
      setShowVideo(false);
    }
  }, [videoEnded]);

  useEffect(() => {
    if (playerRef.current && videoReady && !videoEnded) {
      const player = playerRef.current.getPlayer();
      if (player) {
        if (isOffset) {
          player.pause();
        } else if (player.paused()) {
          player.play();
        }
      }
    }
  }, [isOffset, videoReady, videoEnded]);

  const handleMuteToggle = useCallback(() => {
    if (playerRef.current) {
      const newMuted = playerRef.current.toggleMute();
      setMuted(newMuted);
    }
  }, []);

  if (!heroLoaded) {
    return (
      <Box sx={{ position: "relative", zIndex: 1, height: "56.25vw", bgcolor: '#141414' }} />
    );
  }

  return (
    <Box sx={{ position: "relative", zIndex: 1 }}>
      <Box
        sx={{
          mb: 3,
          pb: "40%",
          top: 0,
          left: 0,
          right: 0,
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "56.25vw",
            position: "absolute",
          }}
        >
          {/* Background Image - Always visible, video fades in on top */}
          {backdropUrl && (
            <>
              <Box
                component="img"
                src={backdropUrl}
                alt="Hero backdrop"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 1,
                }}
              />
              {/* Gradient overlay sulla immagine di sfondo */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 2,
                  background: `
                    linear-gradient(77deg, rgba(0,0,0,0.6) 0%, transparent 85%),
                    linear-gradient(180deg, transparent 0%, transparent 50%, rgba(20,20,20,0.4) 70%, rgba(20,20,20,0.8) 85%, #141414 100%)
                  `,
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
          
          {detailData && (
            <>
              <Box
                className="hero-video-container"
                sx={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  position: "absolute",
                  zIndex: showVideo && !videoEnded ? 2 : 0,
                  opacity: showVideo && !videoEnded ? 1 : 0,
                  transition: 'opacity 1.5s ease-in-out',
                  overflow: 'hidden',
                }}
              >
                {trailerKey && (
                  <VideoJSPlayer
                    options={{
                      loop: false,
                      muted: true,
                      autoplay: videoReady && !videoEnded,
                      controls: false,
                      responsive: true,
                      fluid: true,
                      techOrder: ["youtube"],
                      sources: [
                        {
                          type: "video/youtube",
                          src: `https://www.youtube.com/watch?v=${trailerKey}`,
                        },
                      ],
                    }}
                    ref={playerRef}
                    onEnded={handleVideoEnded}
                    onTimeUpdate={handleTimeUpdate}
                  />
                )}
                {/* Overlay trasparente per bloccare click e nascondere controlli YouTube */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 100,
                    cursor: 'default',
                  }}
                />
                <Box
                  sx={{
                    background: `linear-gradient(77deg,rgba(0,0,0,.6),transparent 85%)`,
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: "26.09%",
                    opacity: 1,
                    position: "absolute",
                    transition: "opacity .5s",
                    zIndex: 101,
                    pointerEvents: 'none',
                  }}
                />
                <Box
                  sx={{
                    backgroundColor: "transparent",
                    backgroundImage:
                      "linear-gradient(180deg,hsla(0,0%,8%,0) 0,hsla(0,0%,8%,.15) 15%,hsla(0,0%,8%,.35) 29%,hsla(0,0%,8%,.58) 44%,#141414 68%,#141414)",
                    backgroundRepeat: "repeat-x",
                    backgroundPosition: "0px top",
                    backgroundSize: "100% 100%",
                    bottom: 0,
                    position: "absolute",
                    height: "14.7vw",
                    opacity: 1,
                    top: "auto",
                    width: "100%",
                  }}
                />
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                    position: "absolute",
                    right: 0,
                    bottom: "35%",
                    zIndex: 150,
                  }}
                >
                  <NetflixIconButton
                    size="large"
                    onClick={handleMuteToggle}
                    sx={{ zIndex: 150 }}
                    data-testid="hero-audio-toggle"
                  >
                    {!muted ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </NetflixIconButton>
                  <MaturityRate>{`${maturityRate}+`}</MaturityRate>
                </Stack>
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <Stack
                  spacing={2}
                  sx={{
                    bottom: "35%",
                    position: "absolute",
                    left: { xs: "4%", md: "60px" },
                    top: 0,
                    width: "36%",
                    zIndex: 150,
                    justifyContent: "flex-end",
                  }}
                >
                  {logoPath ? (
                    <Box
                      component="img"
                      src={logoPath}
                      alt={displayTitle}
                      sx={{
                        maxWidth: "100%",
                        maxHeight: "150px",
                        objectFit: "contain",
                        objectPosition: "left",
                      }}
                    />
                  ) : (
                    <MaxLineTypography
                      variant="h2"
                      maxLine={1}
                      color="text.primary"
                    >
                      {displayTitle}
                    </MaxLineTypography>
                  )}
                  
                  {/* Season Label from Admin */}
                  {seasonLabel && (
                    <Chip
                      label={seasonLabel}
                      sx={{
                        alignSelf: 'flex-start',
                        bgcolor: 'rgba(229,9,20,0.9)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                        px: 1,
                      }}
                    />
                  )}
                  
                  {/* Descrizione - scompare quando parte il trailer, il logo scende al suo posto */}
                  <Box
                    sx={{
                      opacity: showVideo && !videoEnded ? 0 : 1,
                      maxHeight: showVideo && !videoEnded ? 0 : "200px",
                      overflow: "hidden",
                      transition: "opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), max-height 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    <MaxLineTypography
                      variant="body1"
                      maxLine={3}
                      color="text.primary"
                      sx={{
                        fontSize: { xs: "0.85rem", md: "1.20rem" },
                        lineHeight: 1.4,
                      }}
                    >
                      {displayDescription}
                    </MaxLineTypography>
                  </Box>
                  
                  <Stack 
                    direction={{ xs: "column", sm: "row" }} 
                    spacing={1}
                  >
                    <PlayButton 
                      size="small" 
                      mediaType={featuredMediaType}
                      mediaId={featuredId}
                    />
                    <MoreInfoButton
                      size="small"
                      onClick={() => {
                        navigate(`/browse/${featuredMediaType}/${featuredId}`);
                      }}
                    />
                  </Stack>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
