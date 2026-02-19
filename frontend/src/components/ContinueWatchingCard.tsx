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
