import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Dialog,
  IconButton,
  Stack,
  Typography,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  X,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsClockwise,
  DownloadSimple,
  ShareNetwork,
  CaretLeft,
  CaretRight,
  WarningCircle,
} from "phosphor-react";

/**
 * Professional Full-Screen Image Viewer with:
 * - Zoom In, Zoom Out, Reset Zoom
 * - Pinch-to-zoom on touch screens
 * - Double-tap / double-click zoom
 * - Pan/drag when zoomed
 * - Swipe left/right to navigate between multiple images
 * - Image rotation
 * - Direct download and Web Share API
 * - Loading indicator and broken URL error fallback
 */
const FullScreenImageViewer = ({
  open,
  onClose,
  src,
  images = [],
  initialIndex = 0,
  title = "Photo",
  subtitle = "",
}) => {
  // Normalize image list
  const imageList = React.useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images
        .map((item) => {
          if (typeof item === "string") return { src: item };
          if (!item || typeof item !== "object") return null;
          return {
            ...item,
            src: item.src || item.url || item.file || item.img || "",
          };
        })
        .filter((item) => item && item.src);
    }
    if (src) {
      return [{ src, title, subtitle }];
    }
    return [];
  }, [images, src, title, subtitle]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  useEffect(() => {
    if (open) {
      if (initialIndex >= 0 && initialIndex < imageList.length) {
        setCurrentIndex(initialIndex);
      } else {
        setCurrentIndex(0);
      }
    }
  }, [open, initialIndex, imageList.length]);

  const currentItem = imageList[currentIndex] || { src: src || "" };
  const currentSrc =
    currentItem.src || currentItem.url || currentItem.file || currentItem.img || src || "";
  const currentSubtitle =
    currentItem.subtitle ||
    [currentItem.sender, currentItem.formattedTime].filter(Boolean).join(" • ") ||
    subtitle ||
    "";

  // Transform / Zoom states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Gesture tracking refs
  const imgRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTouchDistanceRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);

  // Reset transforms whenever changing image
  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setError(false);
  }, []);

  useEffect(() => {
    resetTransform();
    if (!currentSrc) {
      setLoading(false);
      setError(true);
      return;
    }
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [open, currentIndex, currentSrc, resetTransform]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, imageList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handlePrev, handleNext]);

  // Double tap / double click zoom toggle
  const handleDoubleTap = (clientX, clientY) => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.25, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.25, 1);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    if (scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch event handlers for mobile pinch-to-zoom and swipe
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two-finger pinch gesture start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistanceRef.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }

      touchStartPosRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };

      if (scale > 1) {
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistanceRef.current) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / lastTouchDistanceRef.current;
      setScale((prev) => {
        const next = Math.min(Math.max(prev * ratio, 1), 4);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistanceRef.current = newDist;
    } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      // Pan zoomed image
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      lastTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      // Handle horizontal swipe between images when at 1x zoom
      if (scale === 1 && touchStartPosRef.current.time > 0) {
        const changedTouch = e.changedTouches[0];
        if (changedTouch) {
          const deltaX = changedTouch.clientX - touchStartPosRef.current.x;
          const deltaY = changedTouch.clientY - touchStartPosRef.current.y;
          const deltaTime = Date.now() - touchStartPosRef.current.time;
          if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 400) {
            if (deltaX < 0) {
              handleNext();
            } else {
              handlePrev();
            }
          }
        }
      }
    }
  };

  const handleDownload = () => {
    if (!currentSrc) return;
    try {
      const link = document.createElement("a");
      link.href = currentSrc;
      link.download = currentItem.fileName || `Trackon_Photo_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(currentSrc, "_blank");
    }
  };

  const handleShare = async () => {
    if (!currentSrc) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentItem.title || "Trackon Photo",
          text: currentItem.subtitle || "Shared via Trackon",
          url: currentSrc.startsWith("http") ? currentSrc : undefined,
        });
      } catch (e) {
        // User cancelled share or unsupported
      }
    } else {
      handleDownload();
    }
  };

  if (!open) return null;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: "rgba(10, 10, 14, 0.98)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          WebkitUserSelect: "none",
          overflow: "hidden",
        },
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
          bgcolor: "rgba(15, 15, 20, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <IconButton onClick={onClose} sx={{ color: "#fff", p: 0.75 }}>
            <X size={22} weight="bold" />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: "#fff" }}>
              {currentItem.title || title || "Photo Preview"}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: 11 }}
            >
              {imageList.length > 1
                ? `${currentIndex + 1} of ${imageList.length}${currentSubtitle ? ` • ${currentSubtitle}` : ""}`
                : currentSubtitle || "Full Screen View"}
            </Typography>
          </Box>
        </Stack>

        {/* Toolbar Controls */}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title="Zoom In (+)">
            <IconButton onClick={handleZoomIn} sx={{ color: "#fff", p: 0.75 }}>
              <MagnifyingGlassPlus size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out (-)">
            <IconButton onClick={handleZoomOut} sx={{ color: "#fff", p: 0.75 }}>
              <MagnifyingGlassMinus size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate 90°">
            <IconButton onClick={handleRotate} sx={{ color: "#fff", p: 0.75 }}>
              <ArrowsClockwise size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton onClick={handleDownload} sx={{ color: "#fff", p: 0.75 }}>
              <DownloadSimple size={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton onClick={handleShare} sx={{ color: "#fff", p: 0.75 }}>
              <ShareNetwork size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Main Image Viewport Area */}
      <Box
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleTap}
        sx={{
          flex: 1,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          cursor: scale > 1 ? "grab" : "default",
          "&:active": {
            cursor: scale > 1 ? "grabbing" : "default",
          },
        }}
      >
        {/* Loading Spinner */}
        {loading && !error && (
          <Box
            sx={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              zIndex: 2,
            }}
          >
            <CircularProgress size={38} sx={{ color: "#00A884" }} />
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Loading photo...
            </Typography>
          </Box>
        )}

        {/* Broken / Error Fallback */}
        {error ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              p: 3,
              textAlign: "center",
            }}
          >
            <WarningCircle size={44} color="#EF4444" weight="fill" />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#fff" }}>
              Unable to load photo
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)" }}>
              This image may have been moved, expired, or is currently unavailable.
            </Typography>
          </Box>
        ) : (
          <Box
            ref={imgRef}
            component="img"
            src={currentSrc}
            alt={currentItem.title || "Photo"}
            onLoad={() => {
              setLoading(false);
              setError(false);
            }}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            draggable={false}
            sx={{
              maxWidth: "92vw",
              maxHeight: "82vh",
              objectFit: "contain",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDraggingRef.current ? "none" : "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
              willChange: "transform",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
              borderRadius: scale === 1 ? 1.5 : 0,
            }}
          />
        )}

        {/* Desktop Prev Navigation Arrow */}
        {imageList.length > 1 && currentIndex > 0 && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            sx={{
              position: "absolute",
              left: { xs: 8, sm: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(20, 20, 26, 0.75)",
              color: "#fff",
              p: 1.25,
              "&:hover": { bgcolor: "rgba(35, 35, 45, 0.95)" },
            }}
          >
            <CaretLeft size={24} weight="bold" />
          </IconButton>
        )}

        {/* Desktop Next Navigation Arrow */}
        {imageList.length > 1 && currentIndex < imageList.length - 1 && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            sx={{
              position: "absolute",
              right: { xs: 8, sm: 24 },
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(20, 20, 26, 0.75)",
              color: "#fff",
              p: 1.25,
              "&:hover": { bgcolor: "rgba(35, 35, 45, 0.95)" },
            }}
          >
            <CaretRight size={24} weight="bold" />
          </IconButton>
        )}
      </Box>

      {/* Bottom Footer Info */}
      <Box
        sx={{
          py: 1,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(15, 15, 20, 0.8)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.55)", fontSize: 11 }}>
          Pinch or double-tap to zoom • Drag to pan • Swipe left/right for next photo
        </Typography>
      </Box>
    </Dialog>
  );
};

export default FullScreenImageViewer;
