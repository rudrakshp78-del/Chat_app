import React, { useState } from "react";
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { X } from "phosphor-react";

const STICKER_PACKS = [
  {
    category: "🎂 Birthday",
    items: [
      { emoji: "🎂", label: "Happy Birthday!", bg: ["#FF416C", "#FF4B2B"] },
      { emoji: "🥳", label: "Party Time!", bg: ["#7F00FF", "#E100FF"] },
      { emoji: "🎉", label: "Make a Wish!", bg: ["#F7971E", "#FFD200"] },
      { emoji: "👑", label: "Birthday King/Queen", bg: ["#8A2387", "#E94057"] },
      { emoji: "🎁", label: "For You!", bg: ["#11998e", "#38ef7d"] },
      { emoji: "🥂", label: "Cheers!", bg: ["#00B4DB", "#0083B0"] },
      { emoji: "🎈", label: "Best Day Ever!", bg: ["#FF6B95", "#FF8E53"] },
      { emoji: "🍰", label: "Sweet Day!", bg: ["#EC4899", "#8B5CF6"] },
    ],
  },
  {
    category: "❤️ Love",
    items: [
      { emoji: "❤️", label: "Love You!", bg: ["#eb3349", "#f45c43"] },
      { emoji: "🥰", label: "So Cute!", bg: ["#FF758C", "#FF7EB3"] },
      { emoji: "💖", label: "Miss You!", bg: ["#B24592", "#F15F79"] },
      { emoji: "😘", label: "XOXO", bg: ["#FF416C", "#FF4B2B"] },
      { emoji: "🫶", label: "Forever", bg: ["#834d9b", "#d04ed6"] },
      { emoji: "🌹", label: "For You", bg: ["#cb2d3e", "#ef473a"] },
    ],
  },
  {
    category: "🔥 Vibe",
    items: [
      { emoji: "🔥", label: "On Fire!", bg: ["#f12711", "#f5af19"] },
      { emoji: "💯", label: "100% Facts", bg: ["#232526", "#414345"] },
      { emoji: "😂", label: "LOL!!", bg: ["#F7971E", "#FFD200"] },
      { emoji: "😎", label: "Too Cool", bg: ["#2193b0", "#6dd5ed"] },
      { emoji: "🚀", label: "Let's Go!", bg: ["#4776E6", "#8E54E9"] },
      { emoji: "✨", label: "Good Vibes", bg: ["#00B4DB", "#0083B0"] },
    ],
  },
  {
    category: "👋 Hello",
    items: [
      { emoji: "👋", label: "Hey There!", bg: ["#36D1DC", "#5B86E5"] },
      { emoji: "☀️", label: "Good Morning", bg: ["#FF8008", "#FFC837"] },
      { emoji: "🌙", label: "Good Night", bg: ["#141E30", "#243B55"] },
      { emoji: "🙏", label: "Thank You!", bg: ["#11998e", "#38ef7d"] },
      { emoji: "👏", label: "Awesome!", bg: ["#667eea", "#764ba2"] },
      { emoji: "👍", label: "Got It!", bg: ["#00b09b", "#96c93d"] },
    ],
  },
];

export function renderStickerToDataUrl(sticker) {
  const canvas = document.createElement("canvas");
  canvas.width = 340;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, 340, 240);
  grad.addColorStop(0, sticker.bg[0]);
  grad.addColorStop(1, sticker.bg[1]);

  // Rounded card
  const r = 36;
  ctx.beginPath();
  ctx.moveTo(r, 12);
  ctx.arcTo(328, 12, 328, 228, r);
  ctx.arcTo(328, 228, 12, 228, r);
  ctx.arcTo(12, 228, 12, 12, r);
  ctx.arcTo(12, 12, 328, 12, r);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '84px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(sticker.emoji, 170, 98);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px 'Inter', 'Segoe UI', sans-serif";
  ctx.fillText(sticker.label, 170, 184);

  return canvas.toDataURL("image/png");
}

const StickerPickerPopover = ({ open, onClose, onSelectSticker }) => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  if (!open) return null;

  const activePack = STICKER_PACKS[tab] || STICKER_PACKS[0];

  return (
    <Paper
      elevation={8}
      sx={{
        position: "absolute",
        bottom: "100%",
        left: { xs: 8, sm: 16 },
        mb: 1,
        width: { xs: "calc(100vw - 16px)", sm: 340 },
        maxWidth: 360,
        borderRadius: 3,
        overflow: "hidden",
        zIndex: 1200,
        bgcolor:
          theme.palette.mode === "light"
            ? "#ffffff"
            : theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          Send a Sticker
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 36, borderBottom: `1px solid ${theme.palette.divider}` }}
      >
        {STICKER_PACKS.map((p, idx) => (
          <Tab
            key={idx}
            label={p.category}
            sx={{ minHeight: 36, py: 0.5, px: 1.5, fontSize: "0.75rem" }}
          />
        ))}
      </Tabs>

      <Box
        sx={{
          p: 1.5,
          maxHeight: 240,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1.2,
        }}
      >
        {activePack.items.map((st, idx) => (
          <Box
            key={idx}
            onClick={() => {
              const dataUrl = renderStickerToDataUrl(st);
              onSelectSticker({
                dataUrl,
                label: `${st.emoji} ${st.label}`,
              });
              onClose();
            }}
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${st.bg[0]}, ${st.bg[1]})`,
              color: "#fff",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(0,0,0,0.16)",
              transition: "transform 0.15s ease",
              "&:hover": {
                transform: "scale(1.04)",
              },
            }}
          >
            <Typography sx={{ fontSize: "2.1rem", lineHeight: 1.1 }}>
              {st.emoji}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                fontWeight: 700,
                mt: 0.4,
                color: "#fff",
                fontSize: "0.74rem",
              }}
            >
              {st.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default StickerPickerPopover;
