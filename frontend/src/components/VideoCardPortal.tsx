import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
import { formatMinuteToReadable } from "src/utils/common";
import NetflixIconButton from "./NetflixIconButton";
import AgeLimitChip from "./AgeLimitChip";
import QualityChip from "./QualityChip";
import GenreBreadcrumbs from "./GenreBreadcrumbs";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { MEDIA_TYPE } from "src/types/Common";
import { useGetGenresQuery } from "src/store/slices/genre";
import { MAIN_PATH, TMDB_V3_API_KEY } from "src/constant";
import Box from "@mui/material/Box";
import { getMediaImageUrl } from "src/hooks/useCDNImage";

interface VideoCardModalProps {
  video: Movie;
  anchorElement: HTMLElement;
  mediaType?: MEDIA_TYPE;
}

export default function VideoCardModal({
  video,
  anchorElement,
  mediaType = MEDIA_TYPE.Movie,
}: VideoCardModalProps) {
  const navigate = useNavigate();
  const setPortal = usePortal();
  const rect = anchorElement.getBoundingClientRect();

  const { data: configuration } = useGetConfigurationQuery(undefined);
  const { data: genres } = useGetGenresQuery(mediaType);
  
  // State for logo and trailer
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Fetch logo from TMDB
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const type = mediaType === MEDIA_TYPE.Tv ? 'tv' : 'movie';
        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${video.id}/images?api_key=${TMDB_V3_API_KEY}`
        );
        const data = await response.json();
        
        if (data.logos?.length) {
          // Prefer Italian logo, then English, then any
          const italianLogo = data.logos.find((logo: any) => logo.iso_639_1 === "it");
          const englishLogo = data.logos.find((logo: any) => logo.iso_639_1 === "en");
          const selectedLogo = italianLogo || englishLogo || data.logos[0];
          setLogoUrl(`https://image.tmdb.org/t/p/w300${selectedLogo.file_path}`);
        }
      } catch (e) {
        console.error('Error fetching logo:', e);
      }
    };
    
    fetchLogo();
  }, [video.id, mediaType]);

  // Fetch trailer from TMDB
  useEffect(() => {
    const fetchTrailer = async () => {
      try {
        const type = mediaType === MEDIA_TYPE.Tv ? 'tv' : 'movie';
        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${video.id}/videos?api_key=${TMDB_V3_API_KEY}&language=it-IT`
        );
        const data = await response.json();
        
        // Find a trailer or teaser
        const trailer = data.results?.find((v: any) => 
          v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        
        if (trailer) {
          setTrailerKey(trailer.key);
        }
      } catch (e) {
        console.error('Error fetching trailer:', e);
      }
    };
    
    fetchTrailer();
  }, [video.id, mediaType]);

  // Show trailer after 6 seconds
  useEffect(() => {
    if (!trailerKey) return;
    
    const timer = setTimeout(() => {
      setShowTrailer(true);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [trailerKey]);

  // Handle resume navigation for Continue Watching
  const handlePlayClick = () => {
    setPortal(null, null);
    
    // Check if this is a "Continue Watching" item with resume info
    if (video.resumeInfo) {
      const { mediaType: resumeMediaType, tmdbId, currentTime, season, episode } = video.resumeInfo;
      
      if (resumeMediaType === 'tv') {
        const s = season || 1;
        const e = episode || 1;
        let url = `/${MAIN_PATH.watch}/tv/${tmdbId}?s=${s}&e=${e}`;
        if (currentTime) url += `&t=${Math.floor(currentTime)}`;
        navigate(url);
      } else {
        let url = `/${MAIN_PATH.watch}/movie/${tmdbId}`;
        if (currentTime) url += `?t=${Math.floor(currentTime)}`;
        navigate(url);
      }
      return;
    }
    
    // Normal playback (no resume)
    if (mediaType === MEDIA_TYPE.Tv) {
      navigate(`/${MAIN_PATH.watch}/tv/${video.id}?s=1&e=1`);
    } else {
      navigate(`/${MAIN_PATH.watch}/movie/${video.id}`);
    }
  };

  const handleNavigateToDetail = () => {
    setPortal(null, null);
    navigate(`/${MAIN_PATH.browse}/${mediaType}/${video.id}`);
  };

  const imageUrl = getMediaImageUrl(
    video.id,
    'backdrop',
    video.backdrop_path,
    configuration?.images.base_url,
    'w780'
  );

  const displayTitle = video.title || video.name || '';

  return (
    <Card
      data-portal-card="true"
      onPointerLeave={() => {
        setPortal(null, null);
      }}
      sx={{
        width: rect.width * 1.5,
        height: "100%",
        bgcolor: '#181818',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      {/* Image/Trailer Container */}
      <div
        style={{
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          cursor: "pointer",
          overflow: 'hidden',
        }}
        onClick={handleNavigateToDetail}
        data-testid={`video-card-image-${video.id}`}
      >
        {/* Background Image */}
        <img
          src={imageUrl}
          style={{
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            opacity: showTrailer ? 0.3 : 1,
            transition: 'opacity 0.5s ease',
          }}
          alt={displayTitle}
        />
        
        {/* Trailer YouTube iframe */}
        {showTrailer && trailerKey && (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${trailerKey}&enablejsapi=1`}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '200%',
              height: '200%',
              transform: 'translate(-50%, -50%)',
              border: 'none',
              pointerEvents: 'none',
            }}
            allow="autoplay; encrypted-media"
            title="Trailer"
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60%',
            background: 'linear-gradient(transparent, rgba(24,24,24,0.9))',
            pointerEvents: 'none',
          }}
        />

        {/* Logo or Title */}
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 48,
            bottom: 8,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={displayTitle}
              style={{
                maxWidth: '70%',
                maxHeight: 60,
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            />
          ) : (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                lineHeight: 1.2,
              }}
            >
              {displayTitle}
            </Typography>
          )}
        </div>

        {/* Mute/Unmute Button */}
        {showTrailer && trailerKey && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.5)',
              bgcolor: 'rgba(0,0,0,0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                borderColor: 'white',
              },
            }}
          >
            {isMuted ? (
              <VolumeOffIcon sx={{ fontSize: 16, color: 'white' }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: 16, color: 'white' }} />
            )}
          </Box>
        )}

        {/* Audio indicator when no trailer */}
        {(!showTrailer || !trailerKey) && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.3)',
              bgcolor: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          >
            <VolumeOffIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />
          </Box>
        )}
      </div>

      {/* Card Content */}
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          {/* Action Buttons */}
          <Stack direction="row" spacing={1} alignItems="center">
            <NetflixIconButton
              sx={{ p: 0 }}
              onClick={handlePlayClick}
              data-testid={`video-card-play-${video.id}`}
            >
              <PlayCircleIcon sx={{ width: 40, height: 40 }} />
            </NetflixIconButton>
            <NetflixIconButton data-testid={`video-card-add-${video.id}`}>
              <AddIcon />
            </NetflixIconButton>
            <NetflixIconButton data-testid={`video-card-like-${video.id}`}>
              <ThumbUpOffAltIcon />
            </NetflixIconButton>
            <div style={{ flexGrow: 1 }} />
            <NetflixIconButton
              onClick={handleNavigateToDetail}
              data-testid={`video-card-expand-${video.id}`}
            >
              <ExpandMoreIcon />
            </NetflixIconButton>
          </Stack>

          {/* Info Row */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography
              variant="subtitle2"
              sx={{ color: "success.main", fontWeight: 600 }}
            >
              {`${Math.round(video.vote_average * 10)}% Match`}
            </Typography>
            <AgeLimitChip label={video.adult ? "18+" : "13+"} />
            <Typography variant="caption" sx={{ color: 'grey.400' }}>
              {formatMinuteToReadable(video.runtime || (mediaType === MEDIA_TYPE.Tv ? 45 : 120))}
            </Typography>
            <QualityChip label="HD" />
          </Stack>

          {/* Genres */}
          {genres && video.genre_ids && (
            <GenreBreadcrumbs
              genres={genres
                .filter((genre) => video.genre_ids.includes(genre.id))
                .map((genre) => genre.name)
                .slice(0, 3)}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
