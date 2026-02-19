import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useContinueWatching } from "src/hooks/useContinueWatching";
import { MEDIA_TYPE } from "src/types/Common";
import { Movie } from "src/types/Movie";
import SlickSlider from "./slick-slider/SlickSlider";

export default function ContinueWatchingSection() {
  const { items, username } = useContinueWatching();

  // Convert ContinueWatchingItem to Movie format for slider
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
    }));
  }, [items]);

  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ mt: -2, mb: 2 }}>
      {/* Username */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 500,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
            mb: 0.5,
          }}
        >
          {username}
        </Typography>
      </Box>

      {/* Continue Watching Slider */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 600,
            fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.4rem" },
            px: { xs: 2, sm: 3, md: 4 },
            mb: 1,
          }}
        >
          Continua a guardare
        </Typography>
        <SlickSlider
          movies={movies}
          mediaType={items[0]?.mediaType === 'tv' ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie}
        />
      </Box>
    </Stack>
  );
}
