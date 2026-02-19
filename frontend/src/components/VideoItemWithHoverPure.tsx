import { PureComponent, ForwardedRef, forwardRef } from "react";

type VideoItemWithHoverPureType = {
  src: string;
  innerRef: ForwardedRef<HTMLDivElement>;
  handleHover: (value: boolean) => void;
};

class VideoItemWithHoverPure extends PureComponent<VideoItemWithHoverPureType> {
  render() {
    return (
      <div
        ref={this.props.innerRef}
        style={{
          cursor: "pointer",
          borderRadius: 4,
          width: "100%",
          position: "relative",
          paddingTop: "calc(9 / 16 * 100%)",
          // ✅ Smooth animation setup
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.15s",
          transformOrigin: "center center",
          willChange: "transform",
        }}
        onPointerEnter={() => {
          this.props.handleHover(true);
        }}
        onPointerLeave={() => {
          this.props.handleHover(false);
        }}
      >
        <img
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
            // ✅ Smooth scale animation
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "scale(1)",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          }}
          onPointerEnter={(e) => {
            // ✅ Smooth scale up on hover
            e.currentTarget.style.transform = "scale(1.15)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
            if (this.props.innerRef && typeof this.props.innerRef !== 'function') {
              const parent = this.props.innerRef.current;
              if (parent) {
                parent.style.zIndex = "999";
                parent.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0s";
              }
            }
          }}
          onPointerLeave={(e) => {
            // ✅ Smooth scale down when leaving
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
            if (this.props.innerRef && typeof this.props.innerRef !== 'function') {
              const parent = this.props.innerRef.current;
              if (parent) {
                parent.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), z-index 0s 0.3s";
                parent.style.zIndex = "9";
              }
            }
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
