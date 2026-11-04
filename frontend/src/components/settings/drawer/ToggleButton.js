import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
// @mui
import { alpha, styled, useTheme } from '@mui/material/styles';
import { Box, Tooltip } from '@mui/material';
// utils
import cssStyles from '../../../utils/cssStyles';
//
import Iconify from '../../Iconify';
import { IconButtonAnimate } from '../../animate';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'presets_button_pos';
const HOLD_DURATION = 2000; // 2 seconds hold to unlock movable mode
const JITTER_THRESHOLD = 30; // Tolerant pixel radius so normal finger wobble doesn't cancel hold

const RootStyle = styled('div')(({ theme }) => ({
  ...cssStyles(theme).bgBlur({ opacity: 0.64 }),
  position: 'fixed',
  zIndex: theme.zIndex.drawer + 2,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  touchAction: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0.5),
}));

const DotStyle = styled('span')(({ theme }) => ({
  top: 8,
  width: 8,
  height: 8,
  right: 10,
  borderRadius: '50%',
  position: 'absolute',
  backgroundColor: theme.palette.error.main,
  zIndex: 2,
}));

// ----------------------------------------------------------------------

ToggleButton.propTypes = {
  notDefault: PropTypes.bool,
  onToggle: PropTypes.func,
  open: PropTypes.bool,
};

export default function ToggleButton({ notDefault, open, onToggle }) {
  const theme = useTheme();

  // Saved position { x, y } in px; null means default (right-side center)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  });

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isMovable, setIsMovable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const rootRef = useRef(null);
  const holdTimerRef = useRef(null);
  const animFrameRef = useRef(null);
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isMovableRef = useRef(false);
  const justFinishedDragRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    isMovableRef.current = isMovable;
  }, [isMovable]);

  // Clear hold timer & progress animation
  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Reset button to default right-side center position
  const handleResetPosition = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    setPosition(null);
    setIsMovable(false);
    isMovableRef.current = false;
    setIsDragging(false);
    isDraggingRef.current = false;
    if (rootRef.current) {
      rootRef.current.style.left = '';
      rootRef.current.style.top = '50%';
      rootRef.current.style.right = '0px';
      rootRef.current.style.bottom = '';
      rootRef.current.style.marginTop = '-24px';
    }
  }, []);

  // Listen for reset events (e.g. from Settings drawer reset icon)
  useEffect(() => {
    const handleResetEvent = () => handleResetPosition();
    window.addEventListener('reset-presets-button-pos', handleResetEvent);
    return () => {
      window.removeEventListener('reset-presets-button-pos', handleResetEvent);
    };
  }, [handleResetPosition]);

  // Viewport resize clamping
  useEffect(() => {
    const handleResize = () => {
      setPosition((pos) => {
        if (!pos) return null;
        const buttonWidth = rootRef.current?.offsetWidth || 48;
        const buttonHeight = rootRef.current?.offsetHeight || 48;
        const maxX = Math.max(0, window.innerWidth - buttonWidth);
        const maxY = Math.max(0, window.innerHeight - buttonHeight);
        const newPos = {
          x: Math.max(0, Math.min(maxX, pos.x)),
          y: Math.max(0, Math.min(maxY, pos.y)),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newPos));
        } catch (_) {}
        return newPos;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Window-level pointer listeners for foolproof dragging across the entire screen
  const handleWindowPointerMove = useCallback((e) => {
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (isDraggingRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }
      hasMovedRef.current = true;

      const buttonWidth = rootRef.current?.offsetWidth || 48;
      const buttonHeight = rootRef.current?.offsetHeight || 48;

      const rawX = e.clientX - dragOffsetRef.current.x;
      const rawY = e.clientY - dragOffsetRef.current.y;

      const minX = 0;
      const maxX = Math.max(0, window.innerWidth - buttonWidth);
      const minY = 0;
      const maxY = Math.max(0, window.innerHeight - buttonHeight);

      const clampedX = Math.max(minX, Math.min(maxX, rawX));
      const clampedY = Math.max(minY, Math.min(maxY, rawY));

      currentPosRef.current = { x: clampedX, y: clampedY };

      // Direct style update for 120 FPS instantaneous movement without React re-render lag
      if (rootRef.current) {
        rootRef.current.style.left = `${clampedX}px`;
        rootRef.current.style.top = `${clampedY}px`;
        rootRef.current.style.right = 'auto';
        rootRef.current.style.bottom = 'auto';
        rootRef.current.style.marginTop = '0px';
      }
      return;
    }

    // If still in the 2s holding phase and moved too far (> JITTER_THRESHOLD), cancel hold
    if (dist > JITTER_THRESHOLD) {
      clearHold();
    }
  }, [clearHold]);

  const handleWindowPointerUp = useCallback(() => {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);

    clearHold();

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);

      const buttonWidth = rootRef.current?.offsetWidth || 48;
      const maxX = Math.max(0, window.innerWidth - buttonWidth);

      let finalX = currentPosRef.current.x;
      let finalY = currentPosRef.current.y;

      // Magnetic edge snap within 20px
      if (finalX > maxX - 20) finalX = maxX;
      else if (finalX < 20) finalX = 0;

      const finalPos = { x: finalX, y: finalY };
      currentPosRef.current = finalPos;
      setPosition(finalPos);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
      } catch (_) {}

      if (rootRef.current) {
        rootRef.current.style.left = `${finalX}px`;
        rootRef.current.style.top = `${finalY}px`;
        rootRef.current.style.right = 'auto';
        rootRef.current.style.bottom = 'auto';
        rootRef.current.style.marginTop = '0px';
      }

      // If user moved the button, lock it after placing
      if (hasMovedRef.current) {
        setIsMovable(false);
        isMovableRef.current = false;
      }

      justFinishedDragRef.current = true;
      setTimeout(() => {
        justFinishedDragRef.current = false;
        hasMovedRef.current = false;
      }, 300);
    }
  }, [clearHold, handleWindowPointerMove]);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      clearHold();
    };
  }, [clearHold, handleWindowPointerMove, handleWindowPointerUp]);

  // Pointer Down on the button: start hold timer or initiate drag if already movable
  const handlePointerDown = (e) => {
    // Only primary mouse button or any touch/pen
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    hasMovedRef.current = false;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    currentPosRef.current = {
      x: rect.left,
      y: rect.top,
    };

    // Attach window listeners immediately to track all motion
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    // If already in movable mode, drag immediately!
    if (isMovableRef.current) {
      isDraggingRef.current = true;
      setIsDragging(true);
      return;
    }

    // Start 2-second hold to unlock movable mode
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(progress);

      if (elapsed < HOLD_DURATION) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);

    holdTimerRef.current = setTimeout(() => {
      // 2 seconds completed!
      clearHold();
      setIsMovable(true);
      isMovableRef.current = true;
      setIsDragging(true);
      isDraggingRef.current = true;

      // Haptic feedback buzz on supported devices
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch (_) {}
      }
    }, HOLD_DURATION);
  };

  const handleClick = (e) => {
    // If just finished a drag or movement occurred, do not open settings drawer
    if (justFinishedDragRef.current || hasMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // If button was in unlocked movable mode, tapping it locks it
    if (isMovable) {
      setIsMovable(false);
      isMovableRef.current = false;
      return;
    }
    onToggle();
  };

  // Determine edge docking for rounded corners
  const buttonWidth = 48;
  const isDockedRight = !position || position.x >= (window.innerWidth || 1000) - buttonWidth - 15;
  const isDockedLeft = position && position.x <= 15;

  const tooltipTitle = isDragging
    ? "Release to place"
    : isMovable
    ? "Movable Mode: Drag anywhere (or tap to lock)"
    : isHolding
    ? "Keep holding to move..."
    : "Presets & Settings (Hold 2s to move)";

  return (
    <RootStyle
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleResetPosition}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        ...(position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: 'auto',
              bottom: 'auto',
              marginTop: 0,
            }
          : {
              right: 0,
              top: '50%',
              marginTop: (t) => t.spacing(-3),
            }),
        borderRadius: isDockedRight
          ? '24px 0 20px 24px'
          : isDockedLeft
          ? '0 24px 24px 0'
          : '24px',
        cursor: isDragging ? 'grabbing' : isMovable ? 'grab' : 'pointer',
        transform: isDragging ? 'scale(1.14)' : isMovable ? 'scale(1.08)' : 'scale(1)',
        transition: isDragging
          ? 'none'
          : 'transform 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease',
        boxShadow: (t) =>
          isDragging
            ? `0 16px 36px 0 ${alpha(t.palette.common.black, 0.45)}`
            : isMovable
            ? `0 0 0 3px ${t.palette.primary.main}, 0 8px 24px 0 ${alpha(t.palette.primary.main, 0.4)}`
            : `-12px 12px 32px -4px ${alpha(
                t.palette.mode === 'light' ? t.palette.grey[600] : t.palette.common.black,
                0.36
              )}`,
      }}
    >
      {/* 2-Second Hold Circular Progress Ring */}
      {isHolding && (
        <Box
          component="svg"
          viewBox="0 0 52 52"
          sx={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: 52,
            height: 52,
            pointerEvents: 'none',
            transform: 'rotate(-90deg)',
            zIndex: 4,
          }}
        >
          {/* Background Track */}
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke={alpha(theme.palette.primary.main, 0.25)}
            strokeWidth="4"
          />
          {/* Filling Progress Arc */}
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke={theme.palette.primary.main}
            strokeWidth="4"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - holdProgress / 100)}
            strokeLinecap="round"
          />
        </Box>
      )}

      {/* Floating Indicator Pill during Hold */}
      {isHolding && (
        <Box
          sx={{
            position: 'absolute',
            ...(isDockedRight || (position && position.x > (window.innerWidth || 800) / 2)
              ? { right: '115%', left: 'auto' }
              : { left: '115%', right: 'auto' }),
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            bgcolor: alpha(theme.palette.grey[900], 0.9),
            color: theme.palette.common.white,
            py: 0.5,
            px: 1.25,
            borderRadius: 1.5,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: 'none',
            boxShadow: theme.shadows[8],
            zIndex: 10,
          }}
        >
          Hold to move ({Math.ceil(Math.max(0, (HOLD_DURATION - (holdProgress / 100) * HOLD_DURATION)) / 1000)}s)
        </Box>
      )}

      {/* Movable Mode Animated Border & Hint */}
      {isMovable && !isHolding && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              borderRadius: 'inherit',
              border: `2px dashed ${theme.palette.primary.main}`,
              animation: 'presetsMovablePulse 1.4s infinite ease-in-out',
              pointerEvents: 'none',
              zIndex: 1,
              '@keyframes presetsMovablePulse': {
                '0%': { opacity: 0.5, transform: 'scale(0.98)' },
                '50%': { opacity: 1, transform: 'scale(1.04)' },
                '100%': { opacity: 0.5, transform: 'scale(0.98)' },
              },
            }}
          />

          {!isDragging && (
            <Box
              sx={{
                position: 'absolute',
                ...(isDockedRight || (position && position.x > (window.innerWidth || 800) / 2)
                  ? { right: '115%', left: 'auto' }
                  : { left: '115%', right: 'auto' }),
                top: '50%',
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                py: 0.5,
                px: 1.25,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: 600,
                pointerEvents: 'none',
                boxShadow: theme.shadows[8],
                zIndex: 10,
              }}
            >
              Drag to move • Tap to lock
            </Box>
          )}
        </>
      )}

      {/* Red dot for non-default settings */}
      {notDefault && !open && !isHolding && !isDragging && <DotStyle />}

      <Tooltip title={tooltipTitle} placement={position && position.x < 120 ? 'right' : 'left'}>
        <IconButtonAnimate
          color="inherit"
          onClick={handleClick}
          sx={{
            p: 1.25,
            pointerEvents: isDragging ? 'none' : 'auto',
            transition: (t) => t.transitions.create('all'),
            '&:hover': {
              color: 'primary.main',
              bgcolor: (t) =>
                alpha(t.palette.primary.main, t.palette.action.hoverOpacity),
            },
          }}
        >
          <Iconify
            icon={isMovable || isDragging ? 'ic:round-open-with' : 'eva:options-2-fill'}
            width={20}
            height={20}
          />
        </IconButtonAnimate>
      </Tooltip>
    </RootStyle>
  );
}
