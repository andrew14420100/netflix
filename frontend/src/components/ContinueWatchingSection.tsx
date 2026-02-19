import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useContinueWatching } from "src/hooks/useContinueWatching";
import { Movie } from "src/types/Movie";
import ContinueWatchingCard from "./ContinueWatchingCard";
import { ARROW_MAX_WIDTH } from "src/constant";

export default function ContinueWatchingSection() {
  const { items, username } = useContinueWatching();

  // Convert ContinueWatchingItem to Movie format
  const movies = useMemo((): Movie[] => {
    return items.map(item => ({
      id: item.tmdbId,
      title: item.title,
      name: item.title,
      backdrop_path: item.backdrop_path,
      poster_path: item.poster_path,
      media_type: item.mediaType,
      genre_ids: [],
      vote_average: 0,
      overview: '',
      release_date: '',
      adult: false,
    } as Movie));
  }, [items]);

  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ overflow: "hidden", position: "relative" }}>
      {/* Title matching other sections */}
      <Box sx={{ pl: { xs: "30px", sm: `${ARROW_MAX_WIDTH}px` } }}>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          {username}, continua a guardare:
        </Typography>
      </Box>

      {/* Cards row - matching SlickSlider layout */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          pl: { xs: "30px", sm: `${ARROW_MAX_WIDTH}px` },
          pr: { xs: "30px", sm: `${ARROW_MAX_WIDTH}px` },
          gap: { xs: 0.5, sm: 1 },
          // Hide scrollbar
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {movies.slice(0, 12).map((movie, index) => {
          const item = items[index];
          return (
            <Box
              key={`${movie.id}-${movie.media_type}`}
              sx={{
                flex: '0 0 auto',
                width: {
                  xs: 'calc(50% - 8px)',
                  sm: 'calc(33.333% - 8px)',
                  md: 'calc(25% - 8px)',
                  lg: 'calc(20% - 8px)',
                  xl: 'calc(16.666% - 8px)',
                },
              }}
            >
              <ContinueWatchingCard
                video={movie}
                item={item}
              />
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
