import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import { Movie } from "src/types/Movie";
import { MEDIA_TYPE } from "src/types/Common";
import { MAIN_PATH } from "src/constant";
import VideoItemWithHover from "./VideoItemWithHover";
import { ContinueWatchingItem } from "src/hooks/useContinueWatching";

interface ContinueWatchingCardProps {
  video: Movie;
  item: ContinueWatchingItem;
}

export default function ContinueWatchingCard({ video, item }: ContinueWatchingCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // ✅ Resume from saved position
    let watchUrl = '';
    
    if (item.mediaType === 'tv') {
      // Resume TV show from saved season/episode
      const s = item.season || 1;
      const e = item.episode || 1;
      watchUrl = `/${MAIN_PATH.watch}/tv/${item.tmdbId}?s=${s}&e=${e}`;
      
      // Add timestamp if available
      if (item.currentTime) {
        watchUrl += `&t=${Math.floor(item.currentTime)}`;
      }
    } else {
      // Resume movie from saved timestamp
      watchUrl = `/${MAIN_PATH.watch}/movie/${item.tmdbId}`;
      
      // Add timestamp parameter for resume
      if (item.currentTime) {
        watchUrl += `?t=${Math.floor(item.currentTime)}`;
      }
    }
    
    navigate(watchUrl);
  };

  return (
    <Box
      sx={{ position: 'relative', cursor: 'pointer' }}
      onClick={handleClick}
    >
      {/* Card with hover */}
      <VideoItemWithHover
        video={video}
        mediaType={item.mediaType === 'tv' ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie}
      />
      
      {/* Progress bar under card */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: 'rgba(255,255,255,0.2)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${item?.progress || 15}%`,
            bgcolor: '#e50914',
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
}
