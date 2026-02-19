import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useContinueWatching } from "src/hooks/useContinueWatching";

export default function ContinueWatchingSection() {
  const { items, username } = useContinueWatching();

  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ px: { xs: 2, sm: 3, md: 4 }, mt: -2, mb: 2 }}>
      {/* Username */}
      <Typography
        variant="h6"
        sx={{
          color: "text.primary",
          fontWeight: 500,
          fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
        }}
      >
        {username}
      </Typography>

      {/* Continue Watching Title */}
      <Typography
        variant="h5"
        sx={{
          color: "text.primary",
          fontWeight: 600,
          fontSize: { xs: "1.2rem", sm: "1.3rem", md: "1.4rem" },
        }}
      >
        Continua a guardare
      </Typography>

      {/* Simple grid of items (no slider for now) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 1,
        }}
      >
        {items.slice(0, 10).map((item) => (
          <Box
            key={`${item.tmdbId}-${item.mediaType}`}
            sx={{
              position: 'relative',
              paddingTop: 'calc(9/16 * 100%)',
              borderRadius: 1,
              overflow: 'hidden',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.25s ease',
              },
            }}
          >
            <img
              src={`https://image.tmdb.org/t/p/w300${item.backdrop_path}`}
              alt={item.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 1,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {item.title}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
