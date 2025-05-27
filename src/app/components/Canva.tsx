export function CanvaComponent() {
  return (
    <canvas
      id="heatmap"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflowX: "hidden",
        zIndex: 9999,
      }
      }
    />
  )
}