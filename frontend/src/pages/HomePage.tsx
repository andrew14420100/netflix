import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COMMON_TITLES, TV_TITLES } from "src/constant";
import HeroSection from "src/components/HeroSection";
import { genreSliceEndpoints, useGetGenresQuery } from "src/store/slices/genre";
import { MEDIA_TYPE } from "src/types/Common";
import { CustomGenre, Genre } from "src/types/Genre";
import SliderRowForGenre from "src/components/VideoSlider";
import store from "src/store";

// Backend API URL
const API_URL = import.meta.env.VITE_BACKEND_URL || "";

interface SectionConfig {
  name: string;
  apiString: string;
  mediaType: string;
  order: number;
}

export async function loader() {
  await store.dispatch(
    genreSliceEndpoints.getGenres.initiate(MEDIA_TYPE.Movie)
  );
  return null;
}

export function Component() {
  const { mediaType: filterMediaType } = useParams<{ mediaType?: string }>();
  const [dbSections, setDbSections] = useState<SectionConfig[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  
  // Determine media type from URL or default to movie
  const currentMediaType = filterMediaType === "tv" ? MEDIA_TYPE.Tv : MEDIA_TYPE.Movie;
  
  const { data: genres, isSuccess } = useGetGenresQuery(currentMediaType);

  // Load sections from database
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/sections`);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            setDbSections(data.items);
          }
        }
      } catch (e) {
        console.log("Using default sections");
      } finally {
        setSectionsLoaded(true);
      }
    };
    fetchSections();
  }, []);

  // Get sections: use database sections if available, otherwise use defaults
  const getSections = (): CustomGenre[] => {
    // If we have sections from database, use those
    if (dbSections.length > 0) {
      // Filter by current media type
      const filteredSections = dbSections.filter(s => {
        const sectionMediaType = s.mediaType || 'movie';
        return sectionMediaType === currentMediaType || 
               sectionMediaType === 'mixed' || 
               sectionMediaType === 'all';
      });
      
      // Sort by order and convert to CustomGenre format
      return filteredSections
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(s => ({
          name: s.name,
          apiString: s.apiString
        }));
    }
    
    // Fallback to default titles
    if (currentMediaType === MEDIA_TYPE.Tv) {
      return TV_TITLES;
    }
    return COMMON_TITLES;
  };

  if (isSuccess && genres && genres.length > 0) {
    const sectionTitles = getSections();
    
    return (
      <Stack spacing={2} data-testid="home-page">
        <HeroSection mediaType={currentMediaType} />
        
        {/* Sections - from database or defaults */}
        {sectionTitles.map((genre) => (
          <SliderRowForGenre
            key={genre.apiString + genre.name}
            genre={genre}
            mediaType={currentMediaType}
          />
        ))}
        
        {/* Genre-based sections from TMDB */}
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
  
  // Loading state
  return (
    <Stack spacing={2} data-testid="home-page-loading">
      <HeroSection mediaType={currentMediaType} />
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <Typography color="grey.500">Caricamento contenuti...</Typography>
      </Box>
    </Stack>
  );
}

Component.displayName = "HomePage";
