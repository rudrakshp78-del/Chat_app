import React, { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { Box, CircularProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import Iconify from "./Iconify";

const PULL_THRESHOLD = 65; // px of downward pull required to trigger
const MAX_PULL = 105; // maximum visual pull travel
const DOCKED_HEIGHT = 56; // top position while refreshing

/**
 * Checks if target or any parent element is currently scrolled down.
 * If any scrollable parent has scrollTop > 2, pulling down should be normal scrolling, not pull-to-refresh.
 */
const isScrollAtTop = (target, rootEl) => {
  let el = target;
  while (el && el !== rootEl && el !== document.body) {
    try {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight;

      if (isScrollable && el.scrollTop > 2) {
        return false;
      }
    } catch (_) {}
    el = el.parentElement;
  }
  return true;
};

export default function PullToRefresh({ children, onRefresh }) {
  const theme = useTheme();

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isPulling = useRef(false);
  const canPull = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    setPullDistance(DOCKED_HEIGHT);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([30, 20, 30]);
      } catch (_) {}
    }

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("PullToRefresh error:", err);
    }

    setRefreshSuccess(true);

    setTimeout(() => {
      setPullDistance(0);
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshSuccess(false);
      }, 250);
    }, 450);
  }, [onRefresh]);

  // Touch Events (mobile devices)
  const handleTouchStart = (e) => {
    if (isRefreshing || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    isPulling.current = false;
    hasTriggeredHaptic.current = false;

    canPull.current = isScrollAtTop(e.target, containerRef.current);
  };

  const handleTouchMove = (e) => {
    if (isRefreshing || !canPull.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    const deltaX = touch.clientX - touchStartX.current;

    // Ignore horizontal swipes (tabs, drawers, swipe actions)
    if (Math.abs(deltaX) > Math.abs(deltaY) && !isPulling.current) {
      canPull.current = false;
      return;
    }

    // If user scrolled down inside an inner list, abort pull
    if (!isScrollAtTop(e.target, containerRef.current)) {
      canPull.current = false;
      setPullDistance(0);
      return;
    }

    if (deltaY > 0) {
      isPulling.current = true;
      // Damped pull curve for natural spring resistance
      const distance = Math.min(MAX_PULL, deltaY * 0.45);
      setPullDistance(distance);

      if (e.cancelable) {
        e.preventDefault();
      }

      if (distance >= PULL_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch (_) {}
        }
      } else if (distance < PULL_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      executeRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Pointer Events (mouse on desktop browser)
  const handlePointerDown = (e) => {
    if (isRefreshing) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    touchStartY.current = e.clientY;
    touchStartX.current = e.clientX;
    isPulling.current = false;
    hasTriggeredHaptic.current = false;

    canPull.current = isScrollAtTop(e.target, containerRef.current);
  };

  const handlePointerMove = (e) => {
    if (isRefreshing || !canPull.current) return;
    if (e.pointerType === "mouse" && e.buttons !== 1) return;

    const deltaY = e.clientY - touchStartY.current;
    const deltaX = e.clientX - touchStartX.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && !isPulling.current) {
      canPull.current = false;
      return;
    }

    if (!isScrollAtTop(e.target, containerRef.current)) {
      canPull.current = false;
      setPullDistance(0);
      return;
    }

    if (deltaY > 0) {
      isPulling.current = true;
      const distance = Math.min(MAX_PULL, deltaY * 0.45);
      setPullDistance(distance);

      if (e.cancelable) {
        e.preventDefault();
      }

      if (distance >= PULL_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
      }
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  };

  const handlePointerUp = () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      executeRefresh();
    } else {
      setPullDistance(0);
    }
  };

  return (
    <Box
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        overscrollBehaviorY: "contain",
      }}
    >
      {/* Floating Pull-to-Refresh Indicator Pill */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: `translate(-50%, ${pullDistance - 52}px)`,
          opacity: pullDistance > 10 ? Math.min(1, pullDistance / 35) : 0,
          transition: isPulling.current
            ? "opacity 0.1s ease"
            : "transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease",
          zIndex: (t) => t.zIndex.modal + 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.2,
          py: 0.85,
          px: 2,
          borderRadius: "24px",
          bgcolor:
            theme.palette.mode === "light"
              ? alpha("#FFFFFF", 0.96)
              : alpha(theme.palette.background.paper, 0.96),
          backdropFilter: "blur(10px)",
          color: theme.palette.text.primary,
          boxShadow: `0 8px 28px -4px ${alpha(
            theme.palette.mode === "light"
              ? theme.palette.grey[700]
              : theme.palette.common.black,
            0.26
          )}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          pointerEvents: "none",
        }}
      >
        {isRefreshing ? (
          refreshSuccess ? (
            <>
              <Iconify
                icon="eva:checkmark-circle-2-fill"
                width={20}
                height={20}
                sx={{ color: theme.palette.success.main }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 13 }}>
                Updated
              </Typography>
            </>
          ) : (
            <>
              <CircularProgress
                size={18}
                thickness={4.5}
                sx={{ color: theme.palette.primary.main }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 13 }}>
                Refreshing...
              </Typography>
            </>
          )
        ) : (
          <>
            <Iconify
              icon={
                pullDistance >= PULL_THRESHOLD
                  ? "eva:arrow-upward-outline"
                  : "eva:arrow-downward-outline"
              }
              width={18}
              height={18}
              sx={{
                color:
                  pullDistance >= PULL_THRESHOLD
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                transform: `rotate(${Math.min(
                  180,
                  (pullDistance / PULL_THRESHOLD) * 180
                )}deg)`,
                transition: "transform 0.15s ease, color 0.15s ease",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: 13,
                color:
                  pullDistance >= PULL_THRESHOLD
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
              }}
            >
              {pullDistance >= PULL_THRESHOLD
                ? "Release to refresh"
                : "Pull down to refresh"}
            </Typography>
          </>
        )}
      </Box>

      {/* Main Content Area */}
      {children}
    </Box>
  );
}

PullToRefresh.propTypes = {
  children: PropTypes.node.isRequired,
  onRefresh: PropTypes.func,
};
