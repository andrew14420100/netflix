import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Movie } from "src/types/Movie";
import { usePortal } from "src/providers/PortalProvider";
import { useGetConfigurationQuery } from "src/store/slices/configuration";
import { useCDNImage } from "src/hooks/useCDNImage";
import VideoItemWithHoverPure from "./VideoItemWithHoverPure";

interface VideoItemWithHoverProps {
  video: Movie;
  mediaType?: any;
}

export default function VideoItemWithHover({ video, mediaType }: VideoItemWithHoverProps) {
  const setPortal = usePortal();
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: configuration } = useGetConfigurationQuery(undefined);

  // ✅ Use CDN image system to get correct image immediately
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

  // ✅ OPTIMIZED: Faster hover handling (reduced delay)
  const handleHover = useCallback((hovered: boolean) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (hovered) {
      // ✅ Reduced delay from 100ms to 50ms for snappier feel
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 50);
    } else {
      // ✅ Small delay on leave for smoother transition between cards
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (isHovered && elementRef.current) {
      setPortal(elementRef.current, video, mediaType);
    } else if (!isHovered) {
      // Clear portal immediately when not hovered
      setPortal(null, null);
    }
  }, [isHovered, video, setPortal, mediaType]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      // Clear portal on unmount
      setPortal(null, null);
    };
  }, [setPortal]);

  return (
    <VideoItemWithHoverPure
      ref={elementRef}
      handleHover={handleHover}
      src={imageUrl}
    />
  );
}
