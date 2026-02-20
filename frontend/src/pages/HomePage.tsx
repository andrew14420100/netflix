import { useMemo } from "react";
import { useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COMMON_TITLES, TV_TITLES } from "src/constant";
import HeroSection from "src/components/HeroSection";
import ContinueWatchingSection from "src/components/ContinueWatchingSection";
import { genreSliceEndpoints, useGetGenresQuery } from "src/store/slices/genre";
import { MEDIA_TYPE } from "src/types/Common";
import { CustomGenre, Genre } from "src/types/Genre";
import SliderRowForGenre from "src/components/VideoSlider";
import store from "src/store";
import { useSectionsData } from "src/hooks/useSectionsData";

export async function loader() {
  await store.dispatch(
    genreSliceEndpoints.getGenres.initiate(MEDIA_TYPE.Movie)
  );
  return null;
}

export function Component() {
  const { mediaType: filterMediaType } =
    useParams<{ mediaType?: string }>();

  const { data, isLoading: sectionsLoading } =
    useSectionsData();

  const dbSections = data ?? [];

  const currentMediaType =
    filterMediaType === "tv"
      ? MEDIA_TYPE.Tv
      : MEDIA_TYPE.Movie;

  const { data: genres, isSuccess } =
    useGetGenresQuery(currentMediaType);

  // Memoize sections
  const sectionTitles = useMemo((): CustomGenre[] => {
    if (dbSections.length > 0) {
      const filteredSections = dbSections.filter((s: any) => {
        const sectionMediaType = s.mediaType || "movie";
        return (
          sectionMediaType === currentMediaType ||
          sectionMediaType === "mixed" ||
          sectionMediaType === "all"
        );
      });

      return filteredSections
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((s: any) => ({
          name: s.name,
          apiString: s.apiString,
        }));
    }

    if (currentMediaType === MEDIA_TYPE.Tv) {
      return TV_TITLES;
    }

    return COMMON_TITLES;
  }, [dbSections, currentMediaType]);

  // MAIN RETURN
  if (isSuccess && genres && genres.length > 0) {
    return (
      <Stack spacing={2} data-testid="home-page">
        <HeroSection mediaType={currentMediaType} />
        <ContinueWatchingSection />

        {sectionTitles.map((genre) => (
          <SliderRowForGenre
            key={genre.apiString + genre.name}
            genre={genre}
            mediaType={currentMediaType}
          />
        ))}

        {genres.map((genre: Genre) => (
          <SliderRowForGenre
            key={genre.id}
            genre={genre}
            mediaType={currentMediaType}
          />
        ))}
      </Stack>
    );
  }

  // Loading fallback
  return (
    <Stack spacing={2} data-testid="home-page-loading">
      <HeroSection mediaType={currentMediaType} />
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <Typography color="grey.500">
          Caricamento contenuti...
        </Typography>
      </Box>
    </Stack>
  );
}