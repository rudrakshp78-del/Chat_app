import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowsClockwise,
  Camera,
  Image as ImageIcon,
  X,
} from "phosphor-react";

const CameraCaptureModal = ({ open, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);

  const [facingMode, setFacingMode] = useState("user");
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let active = true;
    const startCamera = async () => {
      setLoading(true);
      setCameraError("");
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (active) {
          setLoading(false);
          setCameraError("Camera access is not supported in this browser. Use the button below to take or upload a photo.");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
      } catch (err) {
        if (active) {
          setLoading(false);
          setCameraError(
            "Could not access camera directly. You can take or select a photo using the button below."
          );
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [open, facingMode]);

  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    onCapture(dataUrl);
  };

  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      stopCamera();
      onCapture(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: "#0D0F14",
          color: "#fff",
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
    >
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFallbackFile}
      />

      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Take a Photo
        </Typography>
        <IconButton
          onClick={() => {
            stopCamera();
            onClose();
          }}
          sx={{ color: "#fff" }}
        >
          <X size={20} />
        </IconButton>
      </Stack>

      {/* Camera Viewfinder */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: 360,
          bgcolor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {loading && <CircularProgress sx={{ color: "#fff" }} />}

        {cameraError ? (
          <Stack spacing={2} alignItems="center" sx={{ px: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
              {cameraError}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Camera size={18} />}
              onClick={() => fallbackInputRef.current?.click()}
            >
              Open Device Camera / Photo
            </Button>
          </Stack>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
            }}
          />
        )}
      </Box>

      {/* Bottom Shutter Controls */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-around"
        sx={{ py: 2, px: 3, bgcolor: "#12151E" }}
      >
        <IconButton
          onClick={() => fallbackInputRef.current?.click()}
          sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
          title="Pick from Gallery"
        >
          <ImageIcon size={22} />
        </IconButton>

        <IconButton
          disabled={Boolean(cameraError) || loading}
          onClick={handleSnapPhoto}
          sx={{
            width: 64,
            height: 64,
            border: "4px solid #fff",
            bgcolor: "#FF3B5C",
            color: "#fff",
            "&:hover": { bgcolor: "#E02E4E" },
          }}
        >
          <Camera size={28} weight="fill" />
        </IconButton>

        <IconButton
          onClick={() =>
            setFacingMode((m) => (m === "user" ? "environment" : "user"))
          }
          sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
          title="Switch Camera"
        >
          <ArrowsClockwise size={22} />
        </IconButton>
      </Stack>
    </Dialog>
  );
};

export default CameraCaptureModal;
