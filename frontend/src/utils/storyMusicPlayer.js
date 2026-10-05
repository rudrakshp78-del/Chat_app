// Instagram Story-Style Music Player & Web Audio Synthesizer + Live Song Search

export const BUILT_IN_SONGS = [
  {
    id: "birthday_classic",
    title: "Happy Birthday To You",
    artist: "Birthday Celebration",
    emoji: "🎂",
    color: "#FF4D8D",
    synthId: "birthday_classic",
    notes: [
      [261.63, 0.3], [261.63, 0.2], [293.66, 0.45], [261.63, 0.45], [349.23, 0.45], [329.63, 0.8],
      [261.63, 0.3], [261.63, 0.2], [293.66, 0.45], [261.63, 0.45], [392.0, 0.45], [349.23, 0.8],
      [261.63, 0.3], [261.63, 0.2], [523.25, 0.45], [440.0, 0.45], [349.23, 0.45], [329.63, 0.45], [293.66, 0.7],
      [466.16, 0.3], [466.16, 0.2], [440.0, 0.45], [349.23, 0.45], [392.0, 0.45], [349.23, 0.9],
    ],
  },
  {
    id: "birthday_party",
    title: "Birthday Bash (Party Anthem)",
    artist: "DJ Trackon",
    emoji: "🥳",
    color: "#8B5CF6",
    synthId: "birthday_party",
    notes: [
      [329.63, 0.22], [392.0, 0.22], [440.0, 0.22], [523.25, 0.35],
      [493.88, 0.22], [440.0, 0.22], [392.0, 0.35], [523.25, 0.35],
      [587.33, 0.25], [523.25, 0.25], [493.88, 0.25], [440.0, 0.25],
      [392.0, 0.25], [440.0, 0.25], [523.25, 0.55],
    ],
  },
  {
    id: "golden_hour",
    title: "Golden Hour",
    artist: "Sunset Vibes",
    emoji: "✨",
    color: "#F59E0B",
    synthId: "golden_hour",
    notes: [
      [329.63, 0.35], [392.0, 0.35], [493.88, 0.35], [659.25, 0.5],
      [587.33, 0.35], [493.88, 0.35], [392.0, 0.5],
      [349.23, 0.35], [440.0, 0.35], [523.25, 0.35], [698.46, 0.55],
    ],
  },
  {
    id: "love_story",
    title: "Forever With You",
    artist: "Acoustic Hearts",
    emoji: "💖",
    color: "#EC4899",
    synthId: "love_story",
    notes: [
      [261.63, 0.4], [329.63, 0.4], [392.0, 0.4], [523.25, 0.6],
      [493.88, 0.4], [392.0, 0.4], [440.0, 0.7],
      [349.23, 0.4], [440.0, 0.4], [523.25, 0.7],
    ],
  },
  {
    id: "night_drive",
    title: "Midnight Neon",
    artist: "Synthwave Dreams",
    emoji: "🔥",
    color: "#06B6D4",
    synthId: "night_drive",
    notes: [
      [220.0, 0.2], [261.63, 0.2], [329.63, 0.2], [440.0, 0.3],
      [392.0, 0.2], [329.63, 0.2], [293.66, 0.3], [261.63, 0.3],
      [220.0, 0.2], [293.66, 0.2], [349.23, 0.2], [440.0, 0.45],
    ],
  },
  {
    id: "good_times",
    title: "Best Day Ever",
    artist: "Feel Good Crew",
    emoji: "🎉",
    color: "#10B981",
    synthId: "good_times",
    notes: [
      [293.66, 0.25], [369.99, 0.25], [440.0, 0.25], [587.33, 0.45],
      [554.37, 0.25], [493.88, 0.25], [440.0, 0.45],
      [392.0, 0.25], [493.88, 0.25], [587.33, 0.6],
    ],
  },
  {
    id: "lofi_rain",
    title: "Coffee & Raindrops",
    artist: "Midnight Lo-Fi",
    emoji: "🌙",
    color: "#6366F1",
    synthId: "lofi_rain",
    notes: [
      [293.66, 0.45], [349.23, 0.45], [440.0, 0.45], [523.25, 0.65],
      [493.88, 0.45], [440.0, 0.45], [349.23, 0.65],
    ],
  },
  {
    id: "celebrate",
    title: "Congratulations!",
    artist: "Victory Fanfare",
    emoji: "🏆",
    color: "#EAB308",
    synthId: "celebrate",
    notes: [
      [261.63, 0.2], [329.63, 0.2], [392.0, 0.2], [523.25, 0.45],
      [392.0, 0.2], [523.25, 0.75],
    ],
  },
];

let activeAudio = null;
let activeSynthStop = null;

export function stopAllSongPreviews() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
    activeAudio = null;
  }
  if (activeSynthStop) {
    try {
      activeSynthStop();
    } catch {}
    activeSynthStop = null;
  }
}

export function playSongPreview(song, onEnded) {
  stopAllSongPreviews();
  if (!song) return () => {};

  // 1. If the song has a real audio stream or uploaded audio data URL
  if (song.previewUrl) {
    try {
      const audio = new window.Audio(song.previewUrl);
      audio.volume = 0.85;
      activeAudio = audio;
      audio.onended = () => {
        activeAudio = null;
        if (onEnded) onEnded();
      };
      audio.onerror = () => {
        activeAudio = null;
        if (onEnded) onEnded();
      };
      audio.play().catch(() => {
        if (onEnded) onEnded();
      });
      return () => {
        try {
          audio.pause();
        } catch {}
        if (activeAudio === audio) activeAudio = null;
      };
    } catch {
      if (onEnded) onEnded();
      return () => {};
    }
  }

  // 2. Synthesize melody via Web Audio API
  const preset =
    BUILT_IN_SONGS.find(
      (s) =>
        s.synthId === song.synthId ||
        s.id === song.id ||
        s.title === song.title
    ) || BUILT_IN_SONGS[0];

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    if (onEnded) onEnded();
    return () => {};
  }

  const ctx = new AudioCtx();
  let cancelled = false;
  const timers = [];

  let timeOffset = 0.05;
  preset.notes.forEach(([freq, dur]) => {
    const startMs = timeOffset * 1000;
    const t = setTimeout(() => {
      if (cancelled || ctx.state === "closed") return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur + 0.02);
      } catch {}
    }, startMs);
    timers.push(t);
    timeOffset += dur + 0.04;
  });

  const endTimer = setTimeout(() => {
    if (!cancelled) {
      try {
        ctx.close();
      } catch {}
      activeSynthStop = null;
      if (onEnded) onEnded();
    }
  }, timeOffset * 1000 + 150);
  timers.push(endTimer);

  const stopFn = () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    try {
      if (ctx.state !== "closed") ctx.close();
    } catch {}
  };

  activeSynthStop = stopFn;
  return stopFn;
}

export async function searchOnlineSongs(query) {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query.trim()
      )}&entity=song&limit=14`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((item) => item.previewUrl)
      .map((item) => ({
        id: `itunes_${item.trackId}`,
        title: item.trackName || "Unknown Track",
        artist: item.artistName || "Unknown Artist",
        previewUrl: item.previewUrl,
        coverUrl: item.artworkUrl100 || "",
        emoji: "🎵",
        color: "#1DB954",
      }));
  } catch {
    return [];
  }
}
