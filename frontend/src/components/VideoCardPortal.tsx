import { useNavigate } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
import { formatMinuteToReadable } from "src/utils/common";
import NetflixIconButton from "./NetflixIconButton";
import MaxLineTypography from "./MaxLineTypography";
import AgeLimitChip from "./AgeLimitChip";
import QualityChip from "./QualityChip";
import GenreBreadcrumbs from "./GenreBreadcrumbs";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { MEDIA_TYPE } from "src/types/Common";
import { useGetGenresQuery } from "src/store/slices/genre";
import { MAIN_PATH } from "src/constant";
import Box from "@mui/material/Box";
import { getMediaImageUrl } from "src/hooks/useCDNImage";

interface VideoCardModalProps {
  video: Movie;
  anchorElement: HTMLElement;
  mediaType?: MEDIA_TYPE;
}

export default function VideoCardModal({
  video,
  anchorElement,
  mediaType = MEDIA_TYPE.Movie,
}: VideoCardModalProps) {
  const navigate = useNavigate();

  const { data: configuration } = useGetConfigurationQuery(undefined);
  const { data: genres } = useGetGenresQuery(mediaType);
  const setPortal = usePortal();
  const rect = anchorElement.getBoundingClientRect();

  // Naviga SEMPRE su pagina dedicata, MAI modal
  const handleNavigateToDetail = () => {
    setPortal(null, null);
    navigate(`/${MAIN_PATH.browse}/${mediaType}/${video.id}`);
  };
  // Gestisce la navigazione al player con il mediaType corretto
  const handlePlayClick = () => {
    setPortal(null, null);
    if (mediaType === MEDIA_TYPE.Tv) {
      // Per le serie TV, inizia sempre dall'episodio 1 della stagione 1
      navigate(`/${MAIN_PATH.watch}/tv/${video.id}?s=1&e=1`);
    } else {
      navigate(`/${MAIN_PATH.watch}/movie/${video.id}`);
    }
  };
  // Usa CDN se disponibile, altrimenti TMDB
  const imageUrl = getMediaImageUrl(
    video.id,
    'backdrop',
    video.backdrop_path,
    configuration?.images.base_url,
    'w780'
  );

  return (
    <Card
      onPointerLeave={() => {
        setPortal(null, null);
      }}
      sx={{
        width: rect.width * 1.5,
        height: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          cursor: "pointer",
        }}
        onClick={handleNavigateToDetail}
        data-testid={`video-card-image-${video.id}`}
      >
        <img
          src={imageUrl}
          style={{
            top: 0,
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            backgroundPosition: "50%",
          }}
          alt={video.title}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            left: 0,
            right: 0,
            bottom: 0,
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingBottom: "4px",
            position: "absolute",
          }}
        >
          <MaxLineTypography
            maxLine={2}
            sx={{ width: "80%", fontWeight: 700 }}
            variant="h6"
          >
            {video.title}
          </MaxLineTypography>
          <div style={{ flexGrow: 1 }} />
          {/* Indicatore audio visivo - NON cliccabile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.5)',
              bgcolor: 'rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          >
            <VolumeUpIcon sx={{ fontSize: 18, color: 'white' }} />
          </Box>
        </div>
      </div>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <NetflixIconButton
              sx={{ p: 0 }}
              onClick={handlePlayClick}
              data-testid={`video-card-play-${video.id}`}
            >
              <PlayCircleIcon sx={{ width: 40, height: 40 }} />
            </NetflixIconButton>
            <NetflixIconButton data-testid={`video-card-add-${video.id}`}>
              <AddIcon />
            </NetflixIconButton>
            <NetflixIconButton data-testid={`video-card-like-${video.id}`}>
              <ThumbUpOffAltIcon />
            </NetflixIconButton>
            <div style={{ flexGrow: 1 }} />
            {/* Freccia naviga a pagina dedicata */}
            <NetflixIconButton
              onClick={handleNavigateToDetail}
              data-testid={`video-card-expand-${video.id}`}
            >
              <ExpandMoreIcon />
            </NetflixIconButton>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle1"
              sx={{ color: "success.main" }}
            >{`${Math.round(video.vote_average * 10)}% Corrispondenza`}</Typography>
            <AgeLimitChip label={video.adult ? "18+" : "13+"} />
            <Typography variant="subtitle2">{`${formatMinuteToReadable(
              video.runtime || (mediaType === MEDIA_TYPE.Tv ? 45 : 120)
            )}`}</Typography>
            <QualityChip label="HD" />
          </Stack>
          {genres && (
            <GenreBreadcrumbs
              genres={genres
                .filter((genre) => video.genre_ids.includes(genre.id))
                .map((genre) => genre.name)}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
