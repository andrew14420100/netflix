import { useEffect, useState, useRef, useMemo } from "react";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { useCDNImage } from "src/hooks/useCDNImage";
import VideoItemWithHoverPure from "./VideoItemWithHoverPure";

interface VideoItemWithHoverProps {
  video: Movie;
}

export default function VideoItemWithHover({ video }: VideoItemWithHoverProps) {
  const setPortal = usePortal();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { data: configuration } = useGetConfigurationQuery(undefined);

  // ✅ FIX: Use CDN image system to get correct image immediately
  const { backdropUrl } = useCDNImage({
    tmdbId: video.id,
    posterPath: video.poster_path,
    backdropPath: video.backdrop_path,
    useDetailBackdrop: false,
  });

  // Fallback to TMDB if CDN image system returns placeholder
  const imageUrl = useMemo(() => {
    if (backdropUrl && backdropUrl !== '/placeholder.jpg') {
      return backdropUrl;
    }
    // Fallback to TMDB
    return `${configuration?.images.base_url || 'https://image.tmdb.org/t/p/'}w300${video.backdrop_path}`;
  }, [backdropUrl, configuration?.images.base_url, video.backdrop_path]);

  useEffect(() => {
    if (isHovered) {
      setPortal(elementRef.current, video);
    }
  }, [isHovered]);

  return (
    <VideoItemWithHoverPure
      ref={elementRef}
      handleHover={setIsHovered}
      src={imageUrl}
    />
  );
}
