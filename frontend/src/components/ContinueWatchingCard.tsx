import Box from "@mui/material/Box";
import { Movie } from "src/types/Movie";
import { MEDIA_TYPE } from "src/types/Common";
import VideoItemWithHover from "./VideoItemWithHover";
import { ContinueWatchingItem } from "src/hooks/useContinueWatching";

interface ContinueWatchingCardProps {
  video: Movie;
  item: ContinueWatchingItem;
}

export default function ContinueWatchingCard({ video, item }: ContinueWatchingCardProps) {
  // Calculate progress percentage from currentTime and duration
  const calculateProgress = (): number => {
    // If progress is already set, use it
    if (item.progress && item.progress > 0) {
      return Math.min(item.progress, 100);
    }
    
    // Calculate from currentTime / duration
    if (item.currentTime && item.duration && item.duration > 0) {
      const calculated = (item.currentTime / item.duration) * 100;
      return Math.min(Math.max(calculated, 0), 100);
    }
    
    // Default to 0 if no data
    return 0;
  };

  const progressPercent = calculateProgress();

  // Enhance video object with resume info for the portal
  const videoWithResumeInfo: Movie & { resumeInfo?: ContinueWatchingItem } = {
    ...video,
    resumeInfo: item,
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Card with hover - VideoItemWithHover handles all interactions */}
      <VideoItemWithHover
        video={videoWithResumeInfo}
        mediaType={item.mediaType === 'tv' ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie}
      />
      
      {/* Progress bar under card - dynamic based on where user stopped */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: 'rgba(100,100,100,0.5)',
          zIndex: 10,
          pointerEvents: 'none',
          borderRadius: '0 0 4px 4px',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${progressPercent}%`,
            bgcolor: '#e50914',
            borderRadius: progressPercent >= 99 ? '0 0 4px 4px' : '0 0 0 4px',
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
}
