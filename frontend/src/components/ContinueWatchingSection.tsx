import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useContinueWatching } from "src/hooks/useContinueWatching";
import { MEDIA_TYPE } from "src/types/Common";
import { Movie } from "src/types/Movie";
import VideoItemWithHover from "./VideoItemWithHover";
import { useGetConfigurationQuery } from "src/store/slices/configuration";

export default function ContinueWatchingSection() {
  const { items, username } = useContinueWatching();
  const { data: configuration } = useGetConfigurationQuery(undefined);

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
    <Stack spacing={1} sx={{ mt: -2, mb: 3 }}>
      {/* Username */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 500,
            fontSize: { xs: "0.95rem", sm: "1rem", md: "1.1rem" },
            mb: 0,
          }}
        >
          {username}
        </Typography>
      </Box>

      {/* Continue Watching with custom grid */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 600,
            fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.4rem" },
            mb: 2,
          }}
        >
          Continua a guardare:
        </Typography>

        {/* Grid of cards with progress */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
              xl: 'repeat(6, 1fr)',
            },
            gap: { xs: 1, sm: 1.5, md: 2 },
          }}
        >
          {movies.slice(0, 12).map((movie, index) => {
            const item = items[index];
            return (
              <Box key={`${movie.id}-${movie.media_type}`} sx={{ position: 'relative' }}>
                {/* Card with hover */}
                <VideoItemWithHover
                  video={movie}
                  mediaType={movie.media_type === 'tv' ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie}
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
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${item?.progress || 15}%`, // Default 15% if not set
                      bgcolor: '#e50914', // Netflix red
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
