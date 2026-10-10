import React from "react";

import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Camera,
  FileText,
  Image as ImageIcon,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  Sticker,
  User,
  X,
} from "phosphor-react";

import { styled, useTheme, alpha } from "@mui/material/styles";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import useResponsive from "../../hooks/useResponsive";
import { socket } from "../../socket";
import { ClearReplyingTo } from "../../redux/slices/Conversation";
import { showSnackbar } from "../../redux/slices/app";
import getAvatarUrl from "../../utils/getAvatarUrl";

import PhotoEditorModal from "./PhotoEditorModal";
import CameraCaptureModal from "./CameraCaptureModal";
import StickerPickerPopover from "./StickerPickerPopover";

const StyledInput = styled(TextField)(() => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

const ATTACHMENT_ACTIONS = [
  {
    id: "photo",
    color: "#8B5CF6",
    icon: <ImageIcon size={22} weight="fill" />,
    title: "Photo & Edit",
    subtitle: "Edit with filters, birthday stickers & song",
  },
  {
    id: "camera",
    color: "#EC4899",
    icon: <Camera size={22} weight="fill" />,
    title: "Camera",
    subtitle: "Snap a photo & customize",
  },
  {
    id: "document",
    color: "#3B82F6",
    icon: <FileText size={22} weight="fill" />,
    title: "Document",
    subtitle: "Share PDF, Word, ZIP or files",
  },
  {
    id: "sticker",
    color: "#F59E0B",
    icon: <Sticker size={22} weight="fill" />,
    title: "Stickers",
    subtitle: "Birthday, love & party stickers",
  },
  {
    id: "contact",
    color: "#10B981",
    icon: <User size={22} weight="fill" />,
    title: "Contact",
    subtitle: "Share a contact card",
  },
];

const Footer = () => {
  const theme = useTheme();
  const isMobile = useResponsive("down", "md");
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  const [openPicker, setOpenPicker] = React.useState(false);
  const [openActions, setOpenActions] = React.useState(false);
  const [openStickers, setOpenStickers] = React.useState(false);
  const [openCamera, setOpenCamera] = React.useState(false);
  const [openContactModal, setOpenContactModal] = React.useState(false);

  // Photo Editor state (when sharing/editing an image)
  const [editorImageSrc, setEditorImageSrc] = React.useState(null);

  const [value, setValue] = React.useState("");

  const inputRef = React.useRef(null);
  const imageInputRef = React.useRef(null);
  const docInputRef = React.useRef(null);

  const { room_id, user, all_users = [] } = useSelector((state) => state.app);
  const { conversations = [], current_conversation, replying_to } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { user_id } = useSelector((state) => state.auth);

  const from = (
    user_id ||
    (typeof window !== "undefined" ? window.localStorage.getItem("user_id") : "")
  )?.toString();

  // Robust recipient user_id resolution
  const to = React.useMemo(() => {
    const currentChat = (conversations || []).find(
      (c) => c?.id?.toString() === room_id?.toString()
    );
    if (currentChat?.user_id) return currentChat.user_id.toString();
    if (current_conversation?.user_id) return current_conversation.user_id.toString();

    if (Array.isArray(current_conversation?.participants)) {
      const other = current_conversation.participants.find(
        (p) => (p?._id || p)?.toString() !== from
      );
      if (other) return (other?._id || other)?.toString();
    }
    if (Array.isArray(currentChat?.participants)) {
      const other = currentChat.participants.find(
        (p) => (p?._id || p)?.toString() !== from
      );
      if (other) return (other?._id || other)?.toString();
    }
    return "";
  }, [conversations, current_conversation, room_id, from]);

  React.useEffect(() => {
    const handleFocus = () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    };
    window.addEventListener("focus_chat_input", handleFocus);
    return () => {
      window.removeEventListener("focus_chat_input", handleFocus);
    };
  }, []);

  const closeAllPopovers = () => {
    setOpenActions(false);
    setOpenPicker(false);
    setOpenStickers(false);
  };

  // Handle selecting an image file -> open Instagram Story Photo Editor!
  const handleImageFilePicked = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditorImageSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle sending the edited photo from PhotoEditorModal
  const handleSendEditedPhoto = ({ dataUrl, caption, song }) => {
    if (!room_id) {
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Please select a conversation first",
        })
      );
      return;
    }

    const finalCaption =
      caption ||
      value.trim() ||
      (song?.title ? `🎵 ${song.title} - ${song.artist || ""}`.trim() : "");

    socket.emit("file_message", {
      to,
      from,
      text: finalCaption,
      file: dataUrl,
      url: dataUrl,
      song: song || undefined,
      conversation_id: room_id,
      type: "Media",
    });

    setEditorImageSrc(null);
    setValue("");
    dispatch(
      showSnackbar({
        severity: "success",
        message: song ? `Photo shared with "${song.title}" 🎵` : "Photo sent!",
      })
    );
  };

  // Handle Document upload
  const handleDocFilePicked = (file) => {
    if (!file || !room_id) return;

    // If file is <= 5 MB, encode as data URL so recipient can download it directly
    if (file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        socket.emit("file_message", {
          to,
          from,
          text: value.trim() || file.name,
          file: ev.target.result,
          url: ev.target.result,
          fileName: file.name,
          conversation_id: room_id,
          type: "Document",
        });
        setValue("");
        dispatch(
          showSnackbar({
            severity: "success",
            message: `Document "${file.name}" sent`,
          })
        );
      };
      reader.readAsDataURL(file);
    } else {
      socket.emit("file_message", {
        to,
        from,
        text: value.trim() || file.name,
        file: file.name,
        url: file.name,
        fileName: file.name,
        conversation_id: room_id,
        type: "Document",
      });
      setValue("");
      dispatch(
        showSnackbar({
          severity: "success",
          message: `Document "${file.name}" sent`,
        })
      );
    }
  };

  // Handle Sticker selection
  const handleSendSticker = ({ dataUrl, label }) => {
    if (!room_id) return;
    socket.emit("file_message", {
      to,
      from,
      text: label || "",
      file: dataUrl,
      url: dataUrl,
      conversation_id: room_id,
      type: "Media",
    });
  };

  // Handle Contact card sharing
  const handleSendContactCard = (contactName, contactDetail) => {
    if (!room_id) return;
    socket.emit("text_message", {
      to,
      from,
      message: `📇 Contact Card: ${contactName}${
        contactDetail ? ` (${contactDetail})` : ""
      }`,
      conversation_id: room_id,
      type: "Text",
      reply: "",
    });
    setOpenContactModal(false);
    dispatch(
      showSnackbar({
        severity: "success",
        message: `Shared contact: ${contactName}`,
      })
    );
  };

  const handleActionTrigger = (actionId) => {
    closeAllPopovers();
    switch (actionId) {
      case "photo":
        imageInputRef.current?.click();
        break;
      case "camera":
        setOpenCamera(true);
        break;
      case "document":
        docInputRef.current?.click();
        break;
      case "sticker":
        setOpenStickers(true);
        break;
      case "contact":
        setOpenContactModal(true);
        break;
      default:
        break;
    }
  };

  const handleSendMessage = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!room_id) {
      return;
    }

    const isUrl = /^https?:\/\/\S+$/i.test(trimmed);

    socket.emit("text_message", {
      to,
      from,
      message: trimmed,
      conversation_id: room_id,
      type: replying_to ? "Reply" : isUrl ? "Link" : "Text",
      reply: replying_to
        ? replying_to.message ||
          (replying_to.subtype === "img" || replying_to.subtype === "Media"
            ? "Photo"
            : "Attachment")
        : "",
    });

    if (replying_to) {
      dispatch(ClearReplyingTo());
    }

    setValue("");
    closeAllPopovers();
  };

  // Also support pasting an image from clipboard directly into the chat input!
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFilePicked(file);
          break;
        }
      }
    }
  };

  const contactListOptions = React.useMemo(() => {
    const myName = `${user?.firstName || "My"} ${user?.lastName || "Contact"}`.trim();
    const list = [
      {
        id: "me",
        name: `${myName} (Me)`,
        detail: user?.email || "Trackon User",
        img: getAvatarUrl(user?.avatar, user?.firstName),
      },
    ];
    (conversations || []).forEach((c) => {
      if (c?.name) {
        list.push({
          id: c.id,
          name: c.name,
          detail: c.about || "Trackon Contact",
          img: c.img,
        });
      }
    });
    (all_users || []).forEach((u) => {
      const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
      if (fullName && !list.some((item) => item.name === fullName)) {
        list.push({
          id: u._id,
          name: fullName,
          detail: u.email || "Trackon Contact",
          img: getAvatarUrl(u?.avatar, u?.firstName),
        });
      }
    });
    return list;
  }, [user, conversations, all_users]);

  return (
    <Box
      sx={{
        width: "100%",
        flexShrink: 0,
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F8FAFF"
            : theme.palette.background.paper,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        position: "relative",
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFilePicked(file);
          e.target.value = "";
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.rar,.xls,.xlsx,.ppt,.pptx,.csv,application/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleDocFilePicked(file);
          e.target.value = "";
        }}
      />

      {/* REPLY PREVIEW BAR */}
      {replying_to && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1,
            backgroundColor:
              theme.palette.mode === "light"
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.primary.main, 0.16),
            borderTop: `1px solid ${theme.palette.divider}`,
            borderLeft: `4px solid ${theme.palette.primary.main}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ minWidth: 0, flexGrow: 1, pr: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.main,
                display: "block",
              }}
            >
              Replying to{" "}
              {replying_to.incoming
                ? current_conversation?.name || "User"
                : "yourself"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.85rem",
              }}
            >
              {replying_to.message ||
                (replying_to.subtype === "img" || replying_to.subtype === "Media"
                  ? "Photo"
                  : "Attachment")}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => dispatch(ClearReplyingTo())}>
            <X size={16} />
          </IconButton>
        </Box>
      )}

      {/* ================= ATTACHMENT MENU POPUP (OUTSIDE TEXTFIELD SO CLICKS ALWAYS WORK) ================= */}
      {openActions && (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            bottom: "100%",
            left: { xs: 8, sm: 16 },
            mb: 1,
            p: 1.25,
            width: { xs: "calc(100vw - 16px)", sm: 290 },
            maxWidth: 310,
            borderRadius: 3,
            zIndex: 1200,
            bgcolor:
              theme.palette.mode === "light"
                ? "#ffffff"
                : theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack spacing={0.5}>
            {ATTACHMENT_ACTIONS.map((item) => (
              <Stack
                key={item.id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                onClick={() => handleActionTrigger(item.id)}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    bgcolor:
                      theme.palette.mode === "light"
                        ? "rgba(0,0,0,0.04)"
                        : "rgba(255,255,255,0.06)",
                  },
                }}
              >
                <Fab
                  size="small"
                  sx={{
                    width: 38,
                    height: 38,
                    minHeight: 38,
                    bgcolor: item.color,
                    color: "#fff",
                    boxShadow: "none",
                    "&:hover": { bgcolor: item.color },
                  }}
                >
                  {item.icon}
                </Fab>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                    {item.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block" }}
                  >
                    {item.subtitle}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ================= STICKER PICKER POPOVER ================= */}
      <StickerPickerPopover
        open={openStickers}
        onClose={() => setOpenStickers(false)}
        onSelectSticker={handleSendSticker}
      />

      {/* ================= EMOJI PICKER ================= */}
      {openPicker && (
        <Box
          sx={{
            position: "absolute",
            bottom: "100%",
            right: isMobile
              ? 8
              : searchParams.get("open") === "true"
              ? 20
              : 80,
            mb: 1,
            maxWidth: "calc(100vw - 16px)",
            zIndex: 1200,
          }}
        >
          <Picker
            theme={theme.palette.mode}
            data={data}
            onEmojiSelect={(emoji) => {
              setValue((prev) => prev + (emoji.native || ""));
            }}
          />
        </Box>
      )}

      {/* ================= KEYBOARD / INPUT BAR ================= */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.75, sm: 1.5 }}
        sx={{
          px: { xs: 1, sm: 1.5 },
          pt: { xs: 0.75, sm: 1.25 },
          pb: { xs: 1, sm: 1.25 },
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <StyledInput
            inputRef={inputRef}
            fullWidth
            placeholder="Write a message..."
            variant="filled"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            InputProps={{
              disableUnderline: true,
              sx: {
                borderRadius: 2.5,
                pl: { xs: 0.5, sm: 1 },
                pr: { xs: 0.5, sm: 1 },
              },
              startAdornment: (
                <InputAdornment position="start" sx={{ mr: { xs: 0.25, sm: 0.5 } }}>
                  <Tooltip title="Attach Photo, Document, Camera, Stickers">
                    <IconButton
                      size={isMobile ? "small" : "medium"}
                      onClick={() => {
                        setOpenActions((prev) => !prev);
                        setOpenPicker(false);
                        setOpenStickers(false);
                      }}
                      color={openActions ? "primary" : "default"}
                    >
                      <LinkSimple size={21} />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    {!isMobile && (
                      <Tooltip title="Share & Edit Photo (Filters, Birthday, Song)">
                        <IconButton
                          size="small"
                          onClick={() => handleActionTrigger("photo")}
                        >
                          <ImageIcon size={21} />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Take Photo with Camera">
                      <IconButton
                        size="small"
                        onClick={() => handleActionTrigger("camera")}
                      >
                        <Camera size={20} />
                      </IconButton>
                    </Tooltip>

                    {!isMobile && (
                      <Tooltip title="Stickers">
                        <IconButton
                          size="small"
                          color={openStickers ? "primary" : "default"}
                          onClick={() => {
                            setOpenStickers((prev) => !prev);
                            setOpenPicker(false);
                            setOpenActions(false);
                          }}
                        >
                          <Sticker size={21} />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Emojis">
                      <IconButton
                        size="small"
                        color={openPicker ? "primary" : "default"}
                        onClick={() => {
                          setOpenPicker((prev) => !prev);
                          setOpenStickers(false);
                          setOpenActions(false);
                        }}
                      >
                        <Smiley size={20} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box
          sx={{
            width: { xs: 44, sm: 48 },
            height: { xs: 44, sm: 48 },
            flexShrink: 0,
            backgroundColor: theme.palette.primary.main,
            borderRadius: 2,
          }}
        >
          <Stack
            sx={{ width: "100%", height: "100%" }}
            alignItems="center"
            justifyContent="center"
          >
            <IconButton onClick={handleSendMessage} sx={{ width: "100%", height: "100%" }}>
              <PaperPlaneTilt color="#fff" size={20} weight="fill" />
            </IconButton>
          </Stack>
        </Box>
      </Stack>

      {/* ================= INSTAGRAM STORY PHOTO EDITOR MODAL ================= */}
      <PhotoEditorModal
        open={Boolean(editorImageSrc)}
        imageSrc={editorImageSrc}
        initialCaption={value}
        onClose={() => setEditorImageSrc(null)}
        onSend={handleSendEditedPhoto}
      />

      {/* ================= LIVE CAMERA CAPTURE MODAL ================= */}
      <CameraCaptureModal
        open={openCamera}
        onClose={() => setOpenCamera(false)}
        onCapture={(capturedDataUrl) => {
          setOpenCamera(false);
          setEditorImageSrc(capturedDataUrl);
        }}
      />

      {/* ================= SHARE CONTACT MODAL ================= */}
      <Dialog
        open={openContactModal}
        onClose={() => setOpenContactModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Share a Contact</DialogTitle>
        <DialogContent dividers sx={{ p: 0, maxHeight: 320 }}>
          <List disablePadding>
            {contactListOptions.map((c) => (
              <ListItemButton
                key={c.id}
                onClick={() => handleSendContactCard(c.name, c.detail)}
              >
                <ListItemAvatar>
                  <Avatar src={c.img} alt={c.name}>
                    {(c.name || "U")[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={c.name}
                  secondary={c.detail}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Footer;