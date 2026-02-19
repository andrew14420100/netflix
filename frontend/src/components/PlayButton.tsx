import Button, { ButtonProps } from "@mui/material/Button";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useNavigate } from "react-router-dom";
import { MAIN_PATH } from "src/constant";
import { MEDIA_TYPE } from "src/types/Common";
import { useContinueWatching } from "src/hooks/useContinueWatching";

interface PlayButtonProps extends ButtonProps {
  mediaType?: string | MEDIA_TYPE;
  mediaId?: number | string;
  season?: number;
  episode?: number;
  title?: string;
  backdrop_path?: string;
  poster_path?: string;
}

export default function PlayButton({ 
  sx, 
  mediaType, 
  mediaId, 
  season = 1, 
  episode = 1,
  title,
  backdrop_path,
  poster_path,
  ...others 
}: PlayButtonProps) {
  const navigate = useNavigate();
  const { addItem } = useContinueWatching();
  
  // Verifica che l'ID sia valido (non nullo, non undefined, non 0)
  const isValidId = mediaId !== undefined && mediaId !== null && mediaId !== 0 && mediaId !== "0";
  
  // Normalizza il mediaType a stringa
  const normalizedMediaType = typeof mediaType === 'string' ? mediaType : mediaType?.toString();
  const isValidMediaType = normalizedMediaType === 'movie' || normalizedMediaType === 'tv';
  
  const handleClick = () => {
    if (!isValidId || !isValidMediaType) {
      console.warn('PlayButton: ID o mediaType non valido', { mediaId, mediaType });
      return;
    }
    
    // ✅ Check if there's a saved position to resume from
    const savedItem = addItem ? undefined : undefined; // Will get from context
    
    // ✅ Add to Continue Watching (or update if from continue watching)
    if (title && backdrop_path) {
      addItem({
        tmdbId: typeof mediaId === 'string' ? parseInt(mediaId) : mediaId,
        mediaType: normalizedMediaType as 'movie' | 'tv',
        title,
        backdrop_path,
        poster_path: poster_path || backdrop_path,
        progress: 0,
        currentTime: 0, // Will be updated during playback
        ...(normalizedMediaType === 'tv' && { season, episode }),
      });
    }
    
    // ✅ Build URL with resume position if available
    let watchUrl = '';
    if (normalizedMediaType === 'tv') {
      watchUrl = `/${MAIN_PATH.watch}/tv/${mediaId}?s=${season}&e=${episode}`;
    } else {
      // For movies, add timestamp parameter if resuming
      watchUrl = `/${MAIN_PATH.watch}/movie/${mediaId}`;
    }
    
    navigate(watchUrl);
  };
  
  return (
    <Button
      color="inherit"
      variant="contained"
      disabled={!isValidId || !isValidMediaType}
      startIcon={<PlayArrowIcon sx={{ fontSize: { xs: "18px !important", sm: "22px !important", md: "40px !important" } }} />}
      {...others}
      sx={{
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.4, sm: 0.6 },
        fontSize: { xs: 12, sm: 14, md: 20 },
        lineHeight: 1.5,
        fontWeight: "bold",
        whiteSpace: "nowrap",
        textTransform: "capitalize",
        ...sx,
      }}
      onClick={handleClick}
      data-testid="play-button"
    >
      Riproduci
    </Button>
  );
}
