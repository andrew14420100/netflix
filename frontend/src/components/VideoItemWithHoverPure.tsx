import { PureComponent, ForwardedRef, forwardRef } from "react";

type VideoItemWithHoverPureType = {
  src: string;
  innerRef: ForwardedRef<HTMLDivElement>;
  handleHover: (value: boolean) => void;
};

class VideoItemWithHoverPure extends PureComponent<VideoItemWithHoverPureType> {
  private containerRef: HTMLDivElement | null = null;
  private imageRef: HTMLImageElement | null = null;
  private isHovered: boolean = false;

  componentWillUnmount() {
    // Cleanup animations
    if (this.containerRef) {
      this.containerRef.style.transform = "scale(1)";
      this.containerRef.style.zIndex = "1";
    }
  }

  handleMouseEnter = () => {
    this.isHovered = true;
    this.props.handleHover(true);
    
    if (this.containerRef) {
      // ✅ Transition PIÙ LENTA: 0.6s invece di 0.3s
      this.containerRef.style.zIndex = "9999";
      this.containerRef.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
      
      requestAnimationFrame(() => {
        if (this.containerRef) {
          this.containerRef.style.transform = "scale(1.05)";
        }
      });
    }
    
    if (this.imageRef) {
      this.imageRef.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6)";
    }
  };

  handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if we're actually leaving to another element
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    // If we're moving to the portal, don't hide
    if (relatedTarget) {
      const isMovingToPortal = relatedTarget.closest('[data-portal-card]') !== null;
      if (isMovingToPortal) {
        return;
      }
    }
    
    this.isHovered = false;
    this.props.handleHover(false);
    
    if (this.containerRef) {
      this.containerRef.style.transform = "scale(1)";
      this.containerRef.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.6s";
      
      setTimeout(() => {
        if (this.containerRef && !this.isHovered) {
          this.containerRef.style.zIndex = "1";
        }
      }, 600); // 300ms → 600ms
    }
    
    if (this.imageRef) {
      this.imageRef.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.4)";
    }
  };

  setContainerRef = (ref: HTMLDivElement | null) => {
    this.containerRef = ref;
    if (typeof this.props.innerRef === 'function') {
      this.props.innerRef(ref);
    } else if (this.props.innerRef) {
      (this.props.innerRef as any).current = ref;
    }
  };

  render() {
    return (
      <div
        ref={this.setContainerRef}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        style={{
          cursor: "pointer",
          borderRadius: "4px",
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          transform: "scale(1)",
          transformOrigin: "center center",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.3s",
          zIndex: 1,
          willChange: "transform",
          pointerEvents: "auto",
        }}
      >
        <img
          ref={(ref) => { this.imageRef = ref; }}
          src={this.props.src}
          alt="Movie poster"
          style={{
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            borderRadius: "4px",
            transition: "box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }
}

const VideoItemWithHoverRef = forwardRef<
  HTMLDivElement,
  Omit<VideoItemWithHoverPureType, "innerRef">
>((props, ref) => <VideoItemWithHoverPure {...props} innerRef={ref} />);
VideoItemWithHoverRef.displayName = "VideoItemWithHoverRef";

export default VideoItemWithHoverRef;
