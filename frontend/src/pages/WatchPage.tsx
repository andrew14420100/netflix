import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, IconButton, Typography, Stack, CircularProgress, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { MAIN_PATH } from "src/constant";

export function Component() {
  const navigate = useNavigate();
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();
  
  // Per le serie TV, ottieni stagione ed episodio dai query params
  const season = searchParams.get("s") || "1";
  const episode = searchParams.get("e") || "1";
  // Resume timestamp parameter
  const startTime = searchParams.get("t");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Costruisci l'URL di VixSrc basandosi sul tipo di media
  const getVixSrcUrl = () => {
    if (!id) return null;
    
    let baseUrl = '';
    if (mediaType === "tv") {
      baseUrl = `https://vixsrc.to/tv/${id}/${season}/${episode}`;
    } else {
      baseUrl = `https://vixsrc.to/movie/${id}`;
    }
    
    // Add resume timestamp if available
    const params = new URLSearchParams();
    params.append('primaryColor', 'E50914');
    params.append('secondaryColor', '8B0000');
    params.append('autoplay', 'true');
    params.append('lang', 'it');
    
    if (startTime) {
      params.append('startAt', startTime);
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const vixSrcUrl = getVixSrcUrl();

  useEffect(() => {
    // Timeout per il loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoBack = () => {
    // Usa la cronologia reale del browser per tornare alla pagina precedente
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback se non c'è cronologia
      navigate(`/${MAIN_PATH.browse}`);
    }
  };

  const handleGoHome = () => {
    navigate(`/${MAIN_PATH.browse}`);
  };

  // Gestione eventi dal player VixSrc
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PLAYER_EVENT") {
        console.log("Player Event:", event.data.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Contenuto non trovato - solo se id manca completamente
  if (!id) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          bgcolor: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 80, color: "#e50914", mb: 3 }} />
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          Contenuto non disponibile
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", mb: 4, textAlign: "center", maxWidth: 400 }}>
          Il contenuto richiesto non è attualmente disponibile o non esiste nel nostro catalogo.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleGoHome}
            startIcon={<ArrowBackIcon />}
            sx={{
              bgcolor: "#e50914",
              color: "#fff",
              px: 4,
              py: 1.5,
              borderRadius: 1,
              fontWeight: 600,
              "&:hover": { bgcolor: "#c40812" },
            }}
          >
            Torna alla Home
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "#000",
        zIndex: 9999,
      }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <CircularProgress sx={{ color: "#e50914", mb: 3 }} size={60} />
          <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>
            Caricamento in corso...
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
            {mediaType === "tv" 
              ? `Stagione ${season} - Episodio ${episode}` 
              : "Film"}
          </Typography>
        </Box>
      )}

      {/* Back Button - Always visible */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 100,
        }}
      >
        <IconButton
          onClick={handleGoBack}
          data-testid="back-button"
          sx={{
            bgcolor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            width: 48,
            height: 48,
            transition: "all 0.3s ease",
            "&:hover": {
              bgcolor: "#e50914",
              borderColor: "transparent",
              transform: "scale(1.1)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      {/* Info Badge - Per TV shows */}
      {mediaType === "tv" && (
        <Box
          sx={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 100,
            bgcolor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(10px)",
            px: 2,
            py: 1,
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Typography variant="body2" sx={{ color: "#fff", fontWeight: 600 }}>
            S{season} E{episode}
          </Typography>
        </Box>
      )}

      {/* VixSrc Player Embed */}
      {vixSrcUrl && (
        <iframe
          src={`${vixSrcUrl}?primaryColor=E50914&secondaryColor=8B0000&autoplay=true&lang=it`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          data-testid="vixsrc-player"
          title={mediaType === "tv" ? `Serie TV - S${season}E${episode}` : "Film"}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError("Impossibile caricare il contenuto");
          }}
        />
      )}

      {/* Error State */}
      {error && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "#0a0a0a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Typography variant="h5" sx={{ color: "#e50914", mb: 2 }}>
            Errore
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)", mb: 4 }}>
            {error}
          </Typography>
          <Stack direction="row" spacing={2}>
            <IconButton
              onClick={() => window.location.reload()}
              sx={{
                bgcolor: "#e50914",
                color: "#fff",
                px: 3,
                py: 1,
                borderRadius: 2,
                "&:hover": { bgcolor: "#c40812" },
              }}
            >
              Riprova
            </IconButton>
            <IconButton
              onClick={handleGoBack}
              sx={{
                bgcolor: "rgba(255,255,255,0.1)",
                color: "#fff",
                px: 3,
                py: 1,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.3)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              Indietro
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

Component.displayName = "WatchPage";
