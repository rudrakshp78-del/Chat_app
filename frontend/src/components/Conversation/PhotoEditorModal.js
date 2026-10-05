import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  InputAdornment,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowCounterClockwise,
  ArrowsLeftRight,
  Cake,
  Check,
  Eraser,
  MagicWand,
  MagnifyingGlass,
  MusicNotes,
  PaintBrush,
  PaperPlaneTilt,
  Pause,
  Play,
  Sparkle,
  TextT,
  Trash,
  UploadSimple,
  X,
} from "phosphor-react";
import {
  BUILT_IN_SONGS,
  playSongPreview,
  searchOnlineSongs,
  stopAllSongPreviews,
} from "../../utils/storyMusicPlayer";

const FILTERS = [
  { id: "normal", name: "Normal", css: "none" },
  {
    id: "clarendon",
    name: "Clarendon",
    css: "contrast(1.2) saturate(1.35)",
  },
  {
    id: "juno",
    name: "Juno",
    css: "contrast(1.15) brightness(1.08) saturate(1.4) sepia(0.1)",
  },
  {
    id: "lark",
    name: "Lark",
    css: "brightness(1.12) contrast(0.95) saturate(1.15)",
  },
  {
    id: "gingham",
    name: "Gingham",
    css: "brightness(1.05) hue-rotate(-10deg) sepia(0.15)",
  },
  {
    id: "moon",
    name: "Moon B&W",
    css: "grayscale(1) contrast(1.15) brightness(1.05)",
  },
  {
    id: "sunset",
    name: "Sunset",
    css: "saturate(1.5) sepia(0.28) contrast(1.08)",
  },
  {
    id: "cyber",
    name: "Cyberpunk",
    css: "saturate(1.65) contrast(1.2) hue-rotate(15deg)",
  },
  {
    id: "vintage",
    name: "Vintage",
    css: "sepia(0.45) contrast(0.95) brightness(1.04)",
  },
  {
    id: "vivid",
    name: "Vivid",
    css: "saturate(1.8) contrast(1.15)",
  },
];

const BIRTHDAY_BADGES = [
  { text: "🎂 Happy Birthday!", bg: "linear-gradient(135deg, #FF416C, #FF4B2B)", color: "#fff" },
  { text: "🥳 Birthday Vibes✨", bg: "linear-gradient(135deg, #8A2387, #E94057, #F27121)", color: "#fff" },
  { text: "🎉 Make a Wish!", bg: "linear-gradient(135deg, #F7971E, #FFD200)", color: "#111" },
  { text: "👑 Birthday Royalty", bg: "linear-gradient(135deg, #7F00FF, #E100FF)", color: "#fff" },
  { text: "🎈 Party Time!", bg: "linear-gradient(135deg, #00B4DB, #0083B0)", color: "#fff" },
  { text: "🎁 Best Day Ever", bg: "linear-gradient(135deg, #11998e, #38ef7d)", color: "#fff" },
  { text: "🍰 Sweet Celebration", bg: "linear-gradient(135deg, #FF6B95, #FF8E53)", color: "#fff" },
  { text: "🥂 Cheers To You!", bg: "linear-gradient(135deg, #232526, #414345)", color: "#FFD700" },
];

const STORY_BADGES = [
  { text: "🔥 LIT", bg: "linear-gradient(135deg, #f12711, #f5af19)", color: "#fff" },
  { text: "❤️ LOVE THIS", bg: "linear-gradient(135deg, #eb3349, #f45c43)", color: "#fff" },
  { text: "✨ GOOD VIBES", bg: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff" },
  { text: "💯 MOOD", bg: "linear-gradient(135deg, #000000, #434343)", color: "#fff" },
  { text: "🎶 VIBING", bg: "linear-gradient(135deg, #1DB954, #191414)", color: "#fff" },
  { text: "🌟 BLESSED", bg: "linear-gradient(135deg, #FCE38A, #F38181)", color: "#111" },
  { text: "😎 CHILL MODE", bg: "linear-gradient(135deg, #2193b0, #6dd5ed)", color: "#fff" },
  { text: `⏰ ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, bg: "rgba(0,0,0,0.7)", color: "#fff" },
];

const BIRTHDAY_EMOJIS = [
  "🎂", "🥳", "🎉", "🎈", "🎊", "🎁", "🕯️", "👑",
  "🍰", "🥂", "🧁", "🎆", "🎇", "💐", "🌟", "💖",
  "🍾", "🪩", "🎶", "💃", "🕺", "🫶", "✨", "🍭",
];

const POPULAR_EMOJIS = [
  "❤️", "🔥", "😂", "😍", "🥰", "😎", "🤩", "🙌",
  "💯", "✨", "🌈", "🦋", "🍕", "☕", "🚀", "💎",
  "🌸", "⚡", "🎯", "🏆", "🎸", "📸", "🌙", "☀️",
];

const TEXT_FONTS = [
  { id: "modern", label: "Modern", family: "'Inter', 'Segoe UI', sans-serif", weight: "800" },
  { id: "classic", label: "Classic", family: "Georgia, serif", weight: "700" },
  { id: "neon", label: "Neon", family: "'Trebuchet MS', sans-serif", weight: "700", neon: true },
  { id: "mono", label: "Typewriter", family: "'Courier New', monospace", weight: "700" },
  { id: "cursive", label: "Script", family: "'Brush Script MT', cursive, sans-serif", weight: "600" },
];

const COLOR_PALETTE = [
  "#FFFFFF", "#000000", "#FF3B5C", "#FF8A00", "#FFD600",
  "#00E676", "#00B0FF", "#7C4DFF", "#FF4081", "#00E5FF",
];

const PhotoEditorModal = ({ open, imageSrc, initialCaption = "", onClose, onSend }) => {
  const [activeTool, setActiveTool] = useState(null); // null | "filters" | "stickers" | "music" | "text" | "draw"
  const [stickerTab, setStickerTab] = useState(0); // 0: Birthday, 1: Story & Emojis

  // Filter & adjustments state
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);

  // Draggable overlay items: { id, type: 'emoji' | 'badge' | 'text', content, x, y, scale, color, bg, fontFamily, neon }
  const [overlays, setOverlays] = useState([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);

  // Music / Song state
  const [selectedSong, setSelectedSong] = useState(null);
  const [musicStyle, setMusicStyle] = useState("pill"); // "pill" | "card" | "vinyl"
  const [musicPos, setMusicPos] = useState({ x: 50, y: 18 }); // percentage coordinates
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState("");
  const [onlineSongs, setOnlineSongs] = useState([]);
  const [searchingSongs, setSearchingSongs] = useState(false);

  // Text creator state
  const [textDraft, setTextDraft] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textBgMode, setTextBgMode] = useState("dark"); // "none" | "dark" | "solid"
  const [textFont, setTextFont] = useState(TEXT_FONTS[0]);

  // Freehand drawing state
  const [brushColor, setBrushColor] = useState("#FF3B5C");
  const [brushSize, setBrushSize] = useState(5);
  const [brushNeon, setBrushNeon] = useState(false);
  const [strokes, setStrokes] = useState([]); // { points: [{x, y}], color, size, neon }
  const isDrawingRef = useRef(false);

  // Caption & exporting
  const [caption, setCaption] = useState(initialCaption);
  const [isSending, setIsSending] = useState(false);

  const stageRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const dragInfoRef = useRef(null);
  const customAudioInputRef = useRef(null);

  // Reset editor when new image opens
  useEffect(() => {
    if (open) {
      setActiveTool(null);
      setSelectedFilter(FILTERS[0]);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setRotation(0);
      setFlipH(false);
      setOverlays([]);
      setSelectedOverlayId(null);
      setSelectedSong(null);
      setIsPlayingSong(false);
      setStrokes([]);
      setCaption(initialCaption || "");
    } else {
      stopAllSongPreviews();
      setIsPlayingSong(false);
    }
  }, [open, imageSrc, initialCaption]);

  useEffect(() => {
    return () => stopAllSongPreviews();
  }, []);

  // Online song search debounce
  useEffect(() => {
    if (!songSearchQuery.trim()) {
      setOnlineSongs([]);
      return;
    }
    let active = true;
    setSearchingSongs(true);
    const timer = setTimeout(async () => {
      const results = await searchOnlineSongs(songSearchQuery);
      if (active) {
        setOnlineSongs(results);
        setSearchingSongs(false);
      }
    }, 380);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [songSearchQuery]);

  // Redraw freehand strokes on overlay canvas
  const redrawStrokes = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      if (stroke.neon) {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      stroke.points.forEach((pt, idx) => {
        const px = (pt.x / 100) * canvas.width;
        const py = (pt.y / 100) * canvas.height;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    });
  }, [strokes]);

  useEffect(() => {
    redrawStrokes();
  }, [redrawStrokes, open]);

  const getStagePercentCoords = (clientX, clientY) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(96, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  // Freehand drawing handlers
  const handleDrawStart = (clientX, clientY) => {
    if (activeTool !== "draw") return;
    isDrawingRef.current = true;
    const pt = getStagePercentCoords(clientX, clientY);
    setStrokes((prev) => [
      ...prev,
      {
        points: [pt],
        color: brushColor,
        size: brushSize,
        neon: brushNeon,
      },
    ]);
  };

  const handleDrawMove = (clientX, clientY) => {
    if (!isDrawingRef.current || activeTool !== "draw") return;
    const pt = getStagePercentCoords(clientX, clientY);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const last = { ...updated[updated.length - 1] };
      last.points = [...last.points, pt];
      updated[updated.length - 1] = last;
      return updated;
    });
  };

  const handleDrawEnd = () => {
    isDrawingRef.current = false;
  };

  // Dragging overlays or music sticker
  const startDragItem = (e, targetType, id) => {
    if (activeTool === "draw") return;
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    if (targetType === "overlay") {
      setSelectedOverlayId(id);
    }
    dragInfoRef.current = {
      targetType,
      id,
      startX: clientX,
      startY: clientY,
    };
  };

  const handleStagePointerMove = (clientX, clientY) => {
    if (activeTool === "draw" && isDrawingRef.current) {
      handleDrawMove(clientX, clientY);
      return;
    }
    if (!dragInfoRef.current) return;
    const coords = getStagePercentCoords(clientX, clientY);
    const { targetType, id } = dragInfoRef.current;
    if (targetType === "music") {
      setMusicPos(coords);
    } else if (targetType === "overlay") {
      setOverlays((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, x: coords.x, y: coords.y } : item
        )
      );
    }
  };

  const handleStagePointerUp = () => {
    handleDrawEnd();
    dragInfoRef.current = null;
  };

  // Add Sticker / Emoji / Badge
  const addEmojiOverlay = (emoji) => {
    const newId = `ov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setOverlays((prev) => [
      ...prev,
      {
        id: newId,
        type: "emoji",
        content: emoji,
        x: 35 + Math.random() * 30,
        y: 35 + Math.random() * 30,
        scale: 1.25,
      },
    ]);
    setSelectedOverlayId(newId);
    setActiveTool(null);
  };

  const addBadgeOverlay = (badge) => {
    const newId = `ov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setOverlays((prev) => [
      ...prev,
      {
        id: newId,
        type: "badge",
        content: badge.text,
        bg: badge.bg,
        color: badge.color || "#fff",
        x: 50,
        y: 30 + Math.random() * 35,
        scale: 1,
      },
    ]);
    setSelectedOverlayId(newId);
    setActiveTool(null);
  };

  const handleAddTextOverlay = () => {
    if (!textDraft.trim()) return;
    const newId = `ov_${Date.now()}`;
    setOverlays((prev) => [
      ...prev,
      {
        id: newId,
        type: "text",
        content: textDraft.trim(),
        color: textColor,
        bgMode: textBgMode,
        fontFamily: textFont.family,
        fontWeight: textFont.weight,
        neon: Boolean(textFont.neon),
        x: 50,
        y: 50,
        scale: 1.1,
      },
    ]);
    setSelectedOverlayId(newId);
    setTextDraft("");
    setActiveTool(null);
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    setIsPlayingSong(true);
    playSongPreview(song, () => setIsPlayingSong(false));
  };

  const handleTogglePlaySong = (songToPlay = selectedSong) => {
    if (!songToPlay) return;
    if (isPlayingSong && selectedSong?.id === songToPlay.id) {
      stopAllSongPreviews();
      setIsPlayingSong(false);
    } else {
      setSelectedSong(songToPlay);
      setIsPlayingSong(true);
      playSongPreview(songToPlay, () => setIsPlayingSong(false));
    }
  };

  const handleCustomAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const customSong = {
        id: `custom_${Date.now()}`,
        title: cleanName || "Custom Audio",
        artist: "My Music",
        previewUrl: ev.target.result,
        emoji: "🎵",
        color: "#FF4081",
      };
      handleSelectSong(customSong);
      setActiveTool(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateSelectedOverlayScale = (delta) => {
    if (!selectedOverlayId) return;
    setOverlays((prev) =>
      prev.map((item) =>
        item.id === selectedOverlayId
          ? { ...item, scale: Math.max(0.5, Math.min(3.0, (item.scale || 1) + delta)) }
          : item
      )
    );
  };

  const deleteSelectedOverlay = () => {
    if (!selectedOverlayId) return;
    setOverlays((prev) => prev.filter((item) => item.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  const combinedFilterString = () => {
    const base = selectedFilter.id === "normal" ? "" : selectedFilter.css;
    const adj = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    return `${base} ${adj}`.trim();
  };

  // Composite everything onto an HTML5 Canvas and send
  const handleExportAndSend = () => {
    if (!imageSrc || isSending) return;
    setIsSending(true);
    stopAllSongPreviews();
    setIsPlayingSong(false);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxDim = 1080;
        const isRotated90 = rotation % 180 !== 0;
        const rawW = isRotated90 ? img.height : img.width;
        const rawH = isRotated90 ? img.width : img.height;

        let width = rawW || 800;
        let height = rawH || 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // 1. Draw base image with filter + rotation + flip
        ctx.save();
        ctx.filter = combinedFilterString();
        ctx.translate(width / 2, height / 2);
        if (rotation) {
          ctx.rotate((rotation * Math.PI) / 180);
        }
        if (flipH) {
          ctx.scale(-1, 1);
        }
        const drawW = isRotated90 ? height : width;
        const drawH = isRotated90 ? width : height;
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Scale factor relative to a 400px stage width
        const scaleFactor = Math.max(width, height) / 420;

        // 2. Draw freehand brush strokes
        strokes.forEach((stroke) => {
          if (!stroke.points || stroke.points.length === 0) return;
          ctx.save();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.size * scaleFactor;
          if (stroke.neon) {
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 14 * scaleFactor;
          }
          ctx.beginPath();
          stroke.points.forEach((pt, idx) => {
            const px = (pt.x / 100) * width;
            const py = (pt.y / 100) * height;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        });

        // Helper for rounded rectangle on canvas
        const drawRoundRect = (x, y, w, h, r) => {
          const radius = Math.min(r, w / 2, h / 2);
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + w, y, x + w, y + h, radius);
          ctx.arcTo(x + w, y + h, x, y + h, radius);
          ctx.arcTo(x, y + h, x, y, radius);
          ctx.arcTo(x, y, x + w, y, radius);
          ctx.closePath();
        };

        // 3. Draw Stickers, Birthday Badges & Text Overlays
        overlays.forEach((item) => {
          const cx = (item.x / 100) * width;
          const cy = (item.y / 100) * height;
          const itemScale = (item.scale || 1) * scaleFactor;

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          if (item.type === "emoji") {
            const fontSize = Math.round(44 * itemScale);
            ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
            ctx.fillText(item.content, cx, cy);
          } else if (item.type === "badge") {
            const fontSize = Math.round(18 * itemScale);
            ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
            const metrics = ctx.measureText(item.content);
            const padX = 18 * itemScale;
            const padY = 11 * itemScale;
            const boxW = metrics.width + padX * 2;
            const boxH = fontSize + padY * 2;

            // Gradient pill background
            const grad = ctx.createLinearGradient(
              cx - boxW / 2,
              cy - boxH / 2,
              cx + boxW / 2,
              cy + boxH / 2
            );
            if (item.content.includes("Birthday")) {
              grad.addColorStop(0, "#FF416C");
              grad.addColorStop(1, "#FF8E53");
            } else {
              grad.addColorStop(0, "#667eea");
              grad.addColorStop(1, "#764ba2");
            }
            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(0,0,0,0.35)";
            ctx.shadowBlur = 10 * scaleFactor;
            drawRoundRect(
              cx - boxW / 2,
              cy - boxH / 2,
              boxW,
              boxH,
              boxH / 2
            );
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = item.color || "#FFFFFF";
            ctx.fillText(item.content, cx, cy + 1);
          } else if (item.type === "text") {
            const fontSize = Math.round(24 * itemScale);
            ctx.font = `${item.fontWeight || "700"} ${fontSize}px ${
              item.fontFamily || "sans-serif"
            }`;
            const metrics = ctx.measureText(item.content);
            const padX = 14 * itemScale;
            const padY = 8 * itemScale;
            const boxW = metrics.width + padX * 2;
            const boxH = fontSize + padY * 2;

            if (item.bgMode && item.bgMode !== "none") {
              ctx.fillStyle =
                item.bgMode === "dark"
                  ? "rgba(0, 0, 0, 0.68)"
                  : item.color === "#FFFFFF"
                  ? "#111111"
                  : "#FFFFFF";
              drawRoundRect(
                cx - boxW / 2,
                cy - boxH / 2,
                boxW,
                boxH,
                10 * itemScale
              );
              ctx.fill();
            }

            if (item.neon) {
              ctx.shadowColor = item.color || "#FF3B5C";
              ctx.shadowBlur = 16 * itemScale;
            } else {
              ctx.shadowColor = "rgba(0,0,0,0.5)";
              ctx.shadowBlur = 4 * itemScale;
            }

            ctx.fillStyle =
              item.bgMode === "solid" && item.color === "#FFFFFF"
                ? "#FFFFFF"
                : item.color || "#FFFFFF";
            ctx.fillText(item.content, cx, cy + 1);
          }

          ctx.restore();
        });

        // 4. Draw Instagram Story Music Sticker if a song is attached
        if (selectedSong) {
          const mx = (musicPos.x / 100) * width;
          const my = (musicPos.y / 100) * height;
          ctx.save();
          const titleFont = Math.round(15 * scaleFactor);
          const subFont = Math.round(12 * scaleFactor);
          ctx.font = `bold ${titleFont}px 'Inter', 'Segoe UI', sans-serif`;
          const titleText = `🎵 ${selectedSong.title}`;
          const artistText = selectedSong.artist || "Music";
          const w1 = ctx.measureText(titleText).width;
          ctx.font = `500 ${subFont}px 'Inter', 'Segoe UI', sans-serif`;
          const w2 = ctx.measureText(artistText).width;

          const boxW = Math.max(w1, w2) + 38 * scaleFactor;
          const boxH = 48 * scaleFactor;

          ctx.fillStyle = "rgba(18, 18, 24, 0.82)";
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur = 12 * scaleFactor;
          drawRoundRect(
            mx - boxW / 2,
            my - boxH / 2,
            boxW,
            boxH,
            boxH / 2
          );
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `bold ${titleFont}px 'Inter', 'Segoe UI', sans-serif`;
          ctx.fillText(titleText, mx, my - 7 * scaleFactor);

          ctx.fillStyle = "rgba(255,255,255,0.78)";
          ctx.font = `500 ${subFont}px 'Inter', 'Segoe UI', sans-serif`;
          ctx.fillText(artistText, mx, my + 11 * scaleFactor);
          ctx.restore();
        }

        const editedDataUrl = canvas.toDataURL("image/jpeg", 0.86);
        setIsSending(false);
        onSend({
          dataUrl: editedDataUrl,
          caption: caption.trim(),
          song: selectedSong
            ? {
                title: selectedSong.title,
                artist: selectedSong.artist,
                previewUrl:
                  selectedSong.previewUrl &&
                  selectedSong.previewUrl.length < 300000
                    ? selectedSong.previewUrl
                    : "",
                coverUrl: selectedSong.coverUrl || "",
                synthId: selectedSong.synthId || selectedSong.id || "",
              }
            : null,
        });
      } catch (err) {
        console.error("Photo export error:", err);
        setIsSending(false);
        onSend({
          dataUrl: imageSrc,
          caption: caption.trim(),
          song: null,
        });
      }
    };
    img.src = imageSrc;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: "#0D0F14",
          color: "#fff",
          borderRadius: { xs: 0, sm: 3 },
          m: { xs: 0, sm: 2 },
          width: "100%",
          maxHeight: { xs: "100vh", sm: "92vh" },
          height: { xs: "100vh", sm: "auto" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      {/* Hidden input for custom audio upload */}
      <input
        ref={customAudioInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleCustomAudioUpload}
      />

      {/* ================= TOP INSTAGRAM STORY TOOLBAR ================= */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: "rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <X size={22} />
        </IconButton>

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Filters & Adjust">
            <IconButton
              onClick={() =>
                setActiveTool(activeTool === "filters" ? null : "filters")
              }
              sx={{
                color: activeTool === "filters" ? "#FF4081" : "#fff",
                bgcolor:
                  activeTool === "filters"
                    ? "rgba(255,64,129,0.18)"
                    : "transparent",
              }}
            >
              <MagicWand size={21} weight="bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Birthday & Story Stickers">
            <IconButton
              onClick={() =>
                setActiveTool(activeTool === "stickers" ? null : "stickers")
              }
              sx={{
                color: activeTool === "stickers" ? "#FFD600" : "#fff",
                bgcolor:
                  activeTool === "stickers"
                    ? "rgba(255,214,0,0.18)"
                    : "transparent",
              }}
            >
              <Cake size={21} weight="bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Add Song / Music">
            <IconButton
              onClick={() =>
                setActiveTool(activeTool === "music" ? null : "music")
              }
              sx={{
                color:
                  activeTool === "music" || selectedSong ? "#00E676" : "#fff",
                bgcolor:
                  activeTool === "music"
                    ? "rgba(0,230,118,0.18)"
                    : "transparent",
              }}
            >
              <MusicNotes size={21} weight="bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Add Text">
            <IconButton
              onClick={() =>
                setActiveTool(activeTool === "text" ? null : "text")
              }
              sx={{
                color: activeTool === "text" ? "#00B0FF" : "#fff",
                bgcolor:
                  activeTool === "text"
                    ? "rgba(0,176,255,0.18)"
                    : "transparent",
              }}
            >
              <TextT size={21} weight="bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Draw / Brush">
            <IconButton
              onClick={() =>
                setActiveTool(activeTool === "draw" ? null : "draw")
              }
              sx={{
                color: activeTool === "draw" ? "#FF8A00" : "#fff",
                bgcolor:
                  activeTool === "draw"
                    ? "rgba(255,138,0,0.18)"
                    : "transparent",
              }}
            >
              <PaintBrush size={21} weight="bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Rotate 90°">
            <IconButton
              onClick={() => setRotation((r) => (r + 90) % 360)}
              sx={{ color: "#fff" }}
            >
              <ArrowCounterClockwise size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Flip Horizontal">
            <IconButton
              onClick={() => setFlipH((f) => !f)}
              sx={{ color: flipH ? "#00B0FF" : "#fff" }}
            >
              <ArrowsLeftRight size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ================= SELECTED OVERLAY QUICK CONTROLS ================= */}
      {selectedOverlayId && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{
            py: 0.6,
            px: 2,
            bgcolor: "rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
            Drag item on photo • Size:
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => updateSelectedOverlayScale(-0.15)}
            sx={{ minWidth: 32, py: 0.2, color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            -
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => updateSelectedOverlayScale(0.15)}
            sx={{ minWidth: 32, py: 0.2, color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
          >
            +
          </Button>
          <IconButton
            size="small"
            onClick={deleteSelectedOverlay}
            sx={{ color: "#FF5252" }}
          >
            <Trash size={18} />
          </IconButton>
        </Stack>
      )}

      {/* ================= INTERACTIVE PHOTO STAGE ================= */}
      <Box
        ref={stageRef}
        onClick={() => {
          if (activeTool !== "draw") setSelectedOverlayId(null);
        }}
        onMouseDown={(e) => handleDrawStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleStagePointerMove(e.clientX, e.clientY)}
        onMouseUp={handleStagePointerUp}
        onMouseLeave={handleStagePointerUp}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handleDrawStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleStagePointerMove(t.clientX, t.clientY);
        }}
        onTouchEnd={handleStagePointerUp}
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 300,
          maxHeight: { xs: "62vh", sm: 440 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#050608",
          overflow: "hidden",
          userSelect: "none",
          touchAction: "none",
          cursor: activeTool === "draw" ? "crosshair" : "default",
        }}
      >
        {imageSrc && (
          <Box
            component="img"
            src={imageSrc}
            alt="Preview"
            draggable={false}
            sx={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: combinedFilterString(),
              transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
              transition: "transform 0.2s ease, filter 0.15s ease",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Freehand Brush Canvas Overlay */}
        <canvas
          ref={drawCanvasRef}
          width={600}
          height={600}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Draggable Stickers, Birthday Badges & Text Overlays */}
        {overlays.map((item) => {
          const isSelected = item.id === selectedOverlayId;
          return (
            <Box
              key={item.id}
              onMouseDown={(e) => startDragItem(e, "overlay", item.id)}
              onTouchStart={(e) => startDragItem(e, "overlay", item.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOverlayId(item.id);
              }}
              sx={{
                position: "absolute",
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${item.scale || 1})`,
                cursor: "grab",
                zIndex: isSelected ? 20 : 12,
                outline: isSelected ? "2px dashed #00E5FF" : "none",
                outlineOffset: 4,
                borderRadius: 2,
                transition: "outline 0.1s ease",
              }}
            >
              {item.type === "emoji" && (
                <Typography sx={{ fontSize: "2.6rem", lineHeight: 1 }}>
                  {item.content}
                </Typography>
              )}

              {item.type === "badge" && (
                <Box
                  sx={{
                    px: 2,
                    py: 0.8,
                    borderRadius: 99,
                    background: item.bg,
                    color: item.color || "#fff",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    letterSpacing: "0.3px",
                  }}
                >
                  {item.content}
                </Box>
              )}

              {item.type === "text" && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    borderRadius: 1.5,
                    bgcolor:
                      item.bgMode === "dark"
                        ? "rgba(0,0,0,0.68)"
                        : item.bgMode === "solid"
                        ? item.color === "#FFFFFF"
                          ? "#111"
                          : "#fff"
                        : "transparent",
                    color: item.color || "#fff",
                    fontFamily: item.fontFamily,
                    fontWeight: item.fontWeight || 700,
                    fontSize: "1.35rem",
                    whiteSpace: "nowrap",
                    textShadow: item.neon
                      ? `0 0 10px ${item.color}, 0 0 22px ${item.color}`
                      : "0 2px 6px rgba(0,0,0,0.6)",
                  }}
                >
                  {item.content}
                </Box>
              )}
            </Box>
          );
        })}

        {/* Draggable Instagram Story Music Sticker */}
        {selectedSong && (
          <Box
            onMouseDown={(e) => startDragItem(e, "music", "music")}
            onTouchStart={(e) => startDragItem(e, "music", "music")}
            sx={{
              position: "absolute",
              left: `${musicPos.x}%`,
              top: `${musicPos.y}%`,
              transform: "translate(-50%, -50%)",
              cursor: "grab",
              zIndex: 25,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              px: 1.75,
              py: 1,
              borderRadius: musicStyle === "card" ? 2.5 : 99,
              bgcolor: "rgba(18, 18, 24, 0.84)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePlaySong(selectedSong);
              }}
              sx={{
                width: 32,
                height: 32,
                bgcolor: selectedSong.color || "#FF4081",
                color: "#fff",
                "&:hover": { bgcolor: selectedSong.color || "#FF4081" },
              }}
            >
              {isPlayingSong ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
            </IconButton>

            <Box sx={{ minWidth: 0, maxWidth: 170 }}>
              <Typography
                variant="caption"
                noWrap
                sx={{ display: "block", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}
              >
                {selectedSong.title}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{
                  display: "block",
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.1,
                }}
              >
                {selectedSong.artist}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                stopAllSongPreviews();
                setIsPlayingSong(false);
                setSelectedSong(null);
              }}
              sx={{ color: "rgba(255,255,255,0.6)", p: 0.25 }}
            >
              <X size={14} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* ================= ACTIVE TOOL DRAWER / PANEL ================= */}
      {activeTool === "filters" && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: "#141821",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Filter Presets Row */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              overflowX: "auto",
              pb: 1,
              "&::-webkit-scrollbar": { height: 4 },
            }}
          >
            {FILTERS.map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                onClick={() => setSelectedFilter(f)}
                size="small"
                 sx={{
                  bgcolor:
                    selectedFilter.id === f.id
                      ? "#FF4081"
                      : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontWeight: selectedFilter.id === f.id ? 700 : 500,
                }}
              />
            ))}
          </Stack>

          {/* Brightness / Contrast / Saturation Sliders */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5, px: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Brightness
              </Typography>
              <Slider
                size="small"
                min={60}
                max={140}
                value={brightness}
                onChange={(_, v) => setBrightness(v)}
                sx={{ color: "#FF4081", py: 0.5 }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Contrast
              </Typography>
              <Slider
                size="small"
                min={60}
                max={150}
                value={contrast}
                onChange={(_, v) => setContrast(v)}
                sx={{ color: "#00B0FF", py: 0.5 }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Saturation
              </Typography>
              <Slider
                size="small"
                min={0}
                max={200}
                value={saturation}
                onChange={(_, v) => setSaturation(v)}
                sx={{ color: "#00E676", py: 0.5 }}
              />
            </Box>
          </Stack>
        </Box>
      )}

      {activeTool === "stickers" && (
        <Box
          sx={{
            p: 1.5,
            maxHeight: 220,
            overflowY: "auto",
            bgcolor: "#141821",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Tabs
            value={stickerTab}
            onChange={(_, v) => setStickerTab(v)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ minHeight: 32, mb: 1 }}
          >
            <Tab label="🎂 Birthday Stickers" sx={{ minHeight: 32, py: 0.5, fontSize: "0.78rem" }} />
            <Tab label="🔥 Story & Emojis" sx={{ minHeight: 32, py: 0.5, fontSize: "0.78rem" }} />
          </Tabs>

          {stickerTab === 0 ? (
            <Stack spacing={1.2}>
              <Stack direction="row" flexWrap="wrap" gap={0.8}>
                {BIRTHDAY_BADGES.map((b, i) => (
                  <Box
                    key={i}
                    onClick={() => addBadgeOverlay(b)}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      background: b.bg,
                      color: b.color,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      "&:hover": { transform: "scale(1.05)" },
                    }}
                  >
                    {b.text}
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.8}>
                {BIRTHDAY_EMOJIS.map((em) => (
                  <IconButton
                    key={em}
                    onClick={() => addEmojiOverlay(em)}
                    sx={{ fontSize: "1.5rem", p: 0.5 }}
                  >
                    <span>{em}</span>
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.2}>
              <Stack direction="row" flexWrap="wrap" gap={0.8}>
                {STORY_BADGES.map((b, i) => (
                  <Box
                    key={i}
                    onClick={() => addBadgeOverlay(b)}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 99,
                      background: b.bg,
                      color: b.color,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      "&:hover": { transform: "scale(1.05)" },
                    }}
                  >
                    {b.text}
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.8}>
                {POPULAR_EMOJIS.map((em) => (
                  <IconButton
                    key={em}
                    onClick={() => addEmojiOverlay(em)}
                    sx={{ fontSize: "1.5rem", p: 0.5 }}
                  >
                    <span>{em}</span>
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          )}
        </Box>
      )}

      {activeTool === "music" && (
        <Box
          sx={{
            p: 1.5,
            maxHeight: 240,
            overflowY: "auto",
            bgcolor: "#141821",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search any song (e.g. Happy Birthday, Arijit, Pop)..."
              value={songSearchQuery}
              onChange={(e) => setSongSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass size={16} color="#aaa" />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  borderRadius: 2,
                  fontSize: "0.82rem",
                },
              }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadSimple size={16} />}
              onClick={() => customAudioInputRef.current?.click()}
              sx={{
                whiteSpace: "nowrap",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.25)",
                textTransform: "none",
              }}
            >
              Upload MP3
            </Button>
          </Stack>

          {searchingSongs && (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={22} sx={{ color: "#00E676" }} />
            </Stack>
          )}

          <Stack spacing={0.8}>
            {(songSearchQuery.trim() ? onlineSongs : BUILT_IN_SONGS).map((song) => {
              const isCurrent = selectedSong?.id === song.id;
              return (
                <Stack
                  key={song.id}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 0.8,
                    px: 1.2,
                    borderRadius: 2,
                    bgcolor: isCurrent
                      ? alpha("#00E676", 0.16)
                      : "rgba(255,255,255,0.05)",
                    border: isCurrent
                      ? "1px solid #00E676"
                      : "1px solid transparent",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.2}
                    sx={{ minWidth: 0, flex: 1, cursor: "pointer" }}
                    onClick={() => handleSelectSong(song)}
                  >
                    {song.coverUrl ? (
                      <Box
                        component="img"
                        src={song.coverUrl}
                        alt={song.title}
                        sx={{ width: 34, height: 34, borderRadius: 1 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 1,
                          bgcolor: song.color || "#FF4081",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        {song.emoji || "🎵"}
                      </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "#fff" }}>
                        {song.title}
                      </Typography>
                      <Typography variant="caption" noWrap sx={{ color: "rgba(255,255,255,0.65)" }}>
                        {song.artist}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() => handleTogglePlaySong(song)}
                      sx={{ color: "#00E676" }}
                    >
                      {isPlayingSong && isCurrent ? (
                        <Pause size={18} weight="fill" />
                      ) : (
                        <Play size={18} weight="fill" />
                      )}
                    </IconButton>
                    <Button
                      size="small"
                      variant={isCurrent ? "contained" : "outlined"}
                      color="success"
                      onClick={() => {
                        handleSelectSong(song);
                        setActiveTool(null);
                      }}
                      sx={{ textTransform: "none", py: 0.2, fontSize: "0.75rem" }}
                    >
                      {isCurrent ? "Added" : "Use"}
                    </Button>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}

      {activeTool === "text" && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: "#141821",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                autoFocus
                placeholder="Type text for photo (e.g. Happy Birthday Bro! 🎉)..."
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTextOverlay();
                  }
                }}
                InputProps={{
                  sx: { bgcolor: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 2 },
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddTextOverlay}
                startIcon={<Check size={16} />}
                sx={{ textTransform: "none" }}
              >
                Add
              </Button>
            </Stack>

            {/* Font Styles & Background Mode */}
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ overflowX: "auto" }}>
              {TEXT_FONTS.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  size="small"
                  onClick={() => setTextFont(f)}
                  sx={{
                    bgcolor:
                      textFont.id === f.id ? "#00B0FF" : "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontFamily: f.family,
                  }}
                />
              ))}
              <Chip
                label={`BG: ${textBgMode.toUpperCase()}`}
                size="small"
                onClick={() =>
                  setTextBgMode((m) =>
                    m === "dark" ? "solid" : m === "solid" ? "none" : "dark"
                  )
                }
                sx={{ bgcolor: "rgba(255,255,255,0.16)", color: "#fff" }}
              />
            </Stack>

            {/* Color Swatches */}
            <Stack direction="row" spacing={1} alignItems="center">
              {COLOR_PALETTE.map((c) => (
                <Box
                  key={c}
                  onClick={() => setTextColor(c)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: c,
                    cursor: "pointer",
                    border:
                      textColor === c ? "2px solid #00E5FF" : "2px solid rgba(255,255,255,0.3)",
                    transform: textColor === c ? "scale(1.18)" : "scale(1)",
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Box>
      )}

      {activeTool === "draw" && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: "#141821",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                {COLOR_PALETTE.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setBrushColor(c)}
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: c,
                      cursor: "pointer",
                      border:
                        brushColor === c
                          ? "2px solid #00E5FF"
                          : "2px solid rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </Stack>

              <Stack direction="row" spacing={0.8}>
                <Chip
                  size="small"
                  icon={<Sparkle size={14} />}
                  label="Neon"
                  onClick={() => setBrushNeon((n) => !n)}
                  sx={{
                    bgcolor: brushNeon ? "#FF4081" : "rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                />
                <Button
                  size="small"
                  onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                  sx={{ color: "#fff", textTransform: "none", minWidth: 0 }}
                >
                  Undo
                </Button>
                <IconButton
                  size="small"
                  onClick={() => setStrokes([])}
                  sx={{ color: "#FF5252" }}
                >
                  <Eraser size={18} />
                </IconButton>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 1 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Brush Size
              </Typography>
              <Slider
                size="small"
                min={2}
                max={18}
                value={brushSize}
                onChange={(_, v) => setBrushSize(v)}
                sx={{ color: brushColor, maxWidth: 180 }}
              />
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ================= BOTTOM CAPTION & SEND BAR ================= */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.2}
        sx={{
          p: 1.5,
          bgcolor: "#0D0F14",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleExportAndSend();
            }
          }}
          InputProps={{
            sx: {
              bgcolor: "rgba(255,255,255,0.08)",
              color: "#fff",
              borderRadius: 99,
              px: 1,
            },
          }}
        />

        <IconButton
          onClick={handleExportAndSend}
          disabled={isSending}
          sx={{
            width: 46,
            height: 46,
            bgcolor: "#25D366",
            color: "#fff",
            flexShrink: 0,
            "&:hover": { bgcolor: "#1EBE5D" },
          }}
        >
          {isSending ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            <PaperPlaneTilt size={22} weight="fill" />
          )}
        </IconButton>
      </Stack>
    </Dialog>
  );
};

export default PhotoEditorModal;
