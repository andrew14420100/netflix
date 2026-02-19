import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useContinueWatching } from "src/hooks/useContinueWatching";
import { Movie } from "src/types/Movie";
import ContinueWatchingCard from "./ContinueWatchingCard";

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
    <Stack spacing={1} sx={{ mt: -2, mb: 3 }}>
      {/* Title: Username, continua a guardare: */}
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
          {username}, continua a guardare:
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
              <ContinueWatchingCard
                key={`${movie.id}-${movie.media_type}`}
                video={movie}
                item={item}
              />
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
