import React, { useState } from "react";

import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Slide

} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import {
  Bell,
  CaretRight,
  Phone,
  Prohibit,
  Star,
  Trash,
  VideoCamera,
  X,
} from "phosphor-react";

import { useDispatch } from "react-redux";

import {
  CloseSidebar,
  UpdateSidebarType,
} from "../redux/slices/app";

import AntSwitch from "./AntSwitch";
import { faker } from "@faker-js/faker";

const Transition = React.forwardRef(function Transtion(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

const BlockDialog = (open, handleClose) => {
  return (
    <Dialog
        open={open}
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        role="alertdialog"
      >
        <DialogTitle>Block this contact</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
           Are you sure you want to block this contact ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
           Cancel
          </Button>
          <Button onClick={handleClose}>Yes</Button>
        </DialogActions>
      </Dialog>
  );
};

const DeleteDialog = (open, handleClose) => {
  return (
    <Dialog
        open={open}
        slots={{
          transition: Transition,
        }}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        role="alertdialog"
      >
        <DialogTitle>Delete this chat</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
           Are you sure you want to Delete this contact ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
           Cancel
          </Button>
          <Button onClick={handleClose}>Yes</Button>
        </DialogActions>
      </Dialog>
  );
};

const Contact = () => {
  
  const theme = useTheme();
  const dispatch = useDispatch();

  const [openBlock, setOpenBlock] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const handleCloseBlock = () => {
    setOpenBlock(false);
  }

   const handleCloseDelete = () => {
    setOpenDelete(false);
  }
  const handleCloseSidebar = () => {
    dispatch(CloseSidebar());
  };

  const handleSharedMessages = () => {
    dispatch(UpdateSidebarType("SHARED"));
  };

  const handleStarredMessages = () => {
    dispatch(UpdateSidebarType("STARRED"));
  };

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 320 },
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Stack sx={{ height: "100%" }}>
        {/* Header */}
        <Box
          sx={{
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
            width: "100%",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.default,
          }}
        >
          <Stack
            sx={{ p: 2 }}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">
              Contact Info
            </Typography>

            <IconButton onClick={handleCloseSidebar}>
              <X size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Body */}
        <Stack
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
          p={3}
          spacing={3}
        >
          {/* Profile */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Avatar
              src="/images/avatar.png"
              alt="John Doe"
              sx={{
                width: 64,
                height: 64,
              }}
            />

            <Stack spacing={0.5}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
              >
                John Doe
              </Typography>

              <Typography
                variant="body2"
                fontWeight={500}
              >
                +91 729 2829 2992
              </Typography>
            </Stack>
          </Stack>

          {/* Voice / Video */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-evenly"
          >
            <Stack spacing={1} alignItems="center">
              <IconButton>
                <Phone size={21} />
              </IconButton>

              <Typography variant="overline">
                Voice
              </Typography>
            </Stack>

            <Stack spacing={1} alignItems="center">
              <IconButton>
                <VideoCamera size={21} />
              </IconButton>

              <Typography variant="overline">
                Video
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          {/* About */}
          <Stack spacing={0.5}>
            <Typography>
              About
            </Typography>

            <Typography variant="body2">
              Imagination is the only limit
            </Typography>
          </Stack>

          <Divider />

          {/* Media */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">
              Media, links & docs
            </Typography>

            <Button
              onClick={handleSharedMessages}
              endIcon={<CaretRight />}
            >
              401
            </Button>
          </Stack>

          {/* Media Images */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            {[1, 2, 3].map((el) => (
             <Box>
              <img src={faker.image.avatar()} alt={faker.name.fullName()} />
             </Box>
            ))}
          </Stack>

          <Divider />

          {/* Starred Messages */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Star size={21} />

              <Typography variant="subtitle2">
                Starred Message
              </Typography>
            </Stack>

            <IconButton onClick={handleStarredMessages}>
              <CaretRight />
            </IconButton>
          </Stack>

          <Divider />

          {/* Mute Notifications */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Bell size={21} />

              <Typography variant="subtitle2">
                Mute Notifications
              </Typography>
            </Stack>

            <AntSwitch />
          </Stack>

          <Divider />

          {/* Common Group */}
          <Typography>
            1 group in common
          </Typography>

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
          >
            <Avatar
              src="/images/group.png"
              alt="Coding Monk"
            />

            <Stack spacing={0.5}>
              <Typography variant="subtitle2">
                Coding Monk
              </Typography>

              <Typography variant="body2">
                Owl, parrot, rabbit, you
              </Typography>
            </Stack>
          </Stack>

          {/* Actions */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
          >
            <Button onClick={() => {
              setOpenBlock(true);
            }}
              startIcon={<Prohibit />}
              fullWidth
              variant="outlined"
            >
              Block
            </Button>

            <Button onClick={() => {
              setOpenDelete(true);
            }}
              startIcon={<Trash />}
              fullWidth
              variant="outlined"
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>
      {openBlock && <BlockDialog open={openBlock} handleClose={handleCloseBlock} />}
      {openDelete && <BlockDialog open={openDelete} handleClose={handleCloseDelete} />}

    </Box>
  );
};

export default Contact;