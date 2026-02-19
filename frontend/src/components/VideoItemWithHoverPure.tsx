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
      // ✅ Immediate z-index change
      this.containerRef.style.zIndex = "9999";
      this.containerRef.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      
      // Small delay for smooth effect
      requestAnimationFrame(() => {
        if (this.containerRef) {
          this.containerRef.style.transform = "scale(1.5)";
        }
      });
    }
    
    if (this.imageRef) {
      this.imageRef.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.7)";
    }
  };

  handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // ✅ IMPORTANT: Check if we're actually leaving to another element
    // If the portal is appearing, we DON'T want to trigger leave
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    // If we're moving to the portal or any child of the portal container, don't hide
    if (relatedTarget) {
      const isMovingToPortal = relatedTarget.closest('[data-portal-card]') !== null;
      if (isMovingToPortal) {
        // Don't trigger leave - we're entering the portal
        return;
      }
    }
    
    this.isHovered = false;
    this.props.handleHover(false);
    
    if (this.containerRef) {
      this.containerRef.style.transform = "scale(1)";
      this.containerRef.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.3s";
      
      // Delay z-index change until animation completes
      setTimeout(() => {
        if (this.containerRef && !this.isHovered) {
          this.containerRef.style.zIndex = "1";
        }
      }, 300);
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
          borderRadius: "6px",
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          transform: "scale(1)",
          transformOrigin: "center center",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.3s",
          zIndex: 1,
          willChange: "transform",
          // ✅ Ensure pointer events work correctly
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
            borderRadius: "6px",
            transition: "box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
            pointerEvents: "none", // Image shouldn't block events
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
