/**
 * WhatsApp Chat Wallpaper Utilities & Presets
 */

export const WALLPAPER_COLORS = [
  { name: "WhatsApp Classic", color: "#EFEAE2", darkColor: "#0B141A" },
  { name: "Fresh Mint", color: "#DCF8C6", darkColor: "#0A291E" },
  { name: "Forest Sage", color: "#D1E7DD", darkColor: "#142D24" },
  { name: "Midnight Navy", color: "#DCEBF4", darkColor: "#0C1E28" },
  { name: "Desert Sand", color: "#F2ECE4", darkColor: "#221C16" },
  { name: "Soft Sky", color: "#E1F5FE", darkColor: "#0F2537" },
  { name: "Vintage Cream", color: "#F7F3E9", darkColor: "#1A1916" },
  { name: "Lilac Mist", color: "#EBE6FA", darkColor: "#1C142A" },
  { name: "Rose Petal", color: "#FCE4EC", darkColor: "#28121A" },
  { name: "Charcoal Night", color: "#E2E8F0", darkColor: "#182229" },
  { name: "Teal Dream", color: "#E0F2F1", darkColor: "#00332C" },
  { name: "Pure Dark", color: "#FFFFFF", darkColor: "#111B21" },
];

/**
 * Lightweight SVG doodle background data URI inspired by WhatsApp web
 */
export const WHATSAPP_DOODLE_SVG =
  "data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 15h10v10H15zM45 10c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm35 5c0 4-3 7-7 7s-7-3-7-7 3-7 7-7 7 3 7 7zm25 5l4 8h-8zM10 50c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10-10-4.5-10-10zm50-5h12v12H60zM95 45c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7zM25 85l-6 10h12zM55 85c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7zm40 5h10v10H95z' fill='%23000000' fill-opacity='0.04' fill-rule='evenodd'/%3E%3C/svg%3E";

export const Trackon_DOODLE_SVG = WHATSAPP_DOODLE_SVG;

export const DEFAULT_WALLPAPER = {
  type: "default", // "default" | "solid" | "image"
  color: "#EFEAE2",
  imageUrl: "",
  overlayDoodles: true,
  dimming: 0, // 0 to 80
};

export const getSavedWallpaper = () => {
  try {
    const raw = localStorage.getItem("chat_wallpaper");
    return raw ? { ...DEFAULT_WALLPAPER, ...JSON.parse(raw) } : DEFAULT_WALLPAPER;
  } catch {
    return DEFAULT_WALLPAPER;
  }
};

export const saveWallpaper = (config) => {
  localStorage.setItem("chat_wallpaper", JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("chat_wallpaper_changed", { detail: config }));
};
