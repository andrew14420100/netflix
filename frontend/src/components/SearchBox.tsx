import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_KEY = "4f153630f8d7e92d542dde3a38fbddf2";

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  width: "100%",
  display: "flex",
  alignItems: "center",
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  cursor: "pointer",
  padding: theme.spacing(0, 1),
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    width: 0,
    transition: theme.transitions.create("width", {
      duration: theme.transitions.duration.complex,
      easing: theme.transitions.easing.easeIn,
    }),
  },
}));

export default function SearchBox() {
  const navigate = useNavigate();
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search on TMDB
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Search on TMDB multi (movies + TV)
        const res = await fetch(
          `${TMDB_API}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=it-IT&page=1`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter only movies and TV shows
          const filtered = (data.results || [])
            .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
            .slice(0, 10);
          setResults(filtered);
          setShowResults(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClickSearchIcon = () => {
    if (!isFocused) {
      searchInputRef.current?.focus();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(`/browse/${result.media_type}/${result.id}`);
    setQuery("");
    setShowResults(false);
    setIsFocused(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <Search
        sx={
          isFocused
            ? { border: "1px solid white", backgroundColor: "black", borderRadius: 1 }
            : {}
        }
      >
        <SearchIconWrapper onClick={handleClickSearchIcon}>
          <SearchIcon />
        </SearchIconWrapper>
        <StyledInputBase
          inputRef={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca film e serie TV..."
          sx={{
            "& .MuiInputBase-input": {
              width: isFocused ? "200px" : 0,
            },
          }}
          inputProps={{
            "aria-label": "cerca",
            onFocus: () => {
              setIsFocused(true);
              if (query.length >= 2) setShowResults(true);
            },
          }}
        />
        {isFocused && query && (
          <IconButton size="small" onClick={handleClear} sx={{ color: "grey.400" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        {loading && (
          <CircularProgress size={16} sx={{ color: "#e50914", mr: 1 }} />
        )}
      </Search>

      {/* Results Dropdown */}
      {showResults && (
        <Box
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            mt: 1,
            bgcolor: "rgba(20,20,20,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 2,
            maxHeight: 400,
            overflowY: "auto",
            zIndex: 1000,
            minWidth: 300,
          }}
        >
          {results.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="grey.500">
                {query.length >= 2
                  ? "Nessun risultato trovato"
                  : "Digita almeno 2 caratteri"}
              </Typography>
            </Box>
          ) : (
            results.map((result) => {
              const title = result.title || result.name || "Unknown";
              const releaseDate = result.release_date || result.first_air_date;
              
              return (
                <Box
                  key={`${result.media_type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    transition: "background 0.2s",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  {/* Poster */}
                  <Box
                    sx={{
                      width: 40,
                      height: 60,
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "#1a1a1a",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {result.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : result.media_type === "movie" ? (
                      <MovieIcon sx={{ color: "grey.700" }} />
                    ) : (
                      <TvIcon sx={{ color: "grey.700" }} />
                    )}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#fff",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {title}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Chip
                        label={result.media_type === "movie" ? "Film" : "TV"}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 10,
                          bgcolor:
                            result.media_type === "movie"
                              ? "rgba(59,130,246,0.2)"
                              : "rgba(139,92,246,0.2)",
                          color: result.media_type === "movie" ? "#3b82f6" : "#8b5cf6",
                        }}
                      />
                      {releaseDate && (
                        <Typography variant="caption" color="grey.500">
                          {new Date(releaseDate).getFullYear()}
                        </Typography>
                      )}
                      {result.vote_average > 0 && (
                        <Typography variant="caption" color="grey.500">
                          ⭐ {result.vote_average.toFixed(1)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}
