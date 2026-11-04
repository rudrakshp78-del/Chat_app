import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
} from "@mui/material";

import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import FormProvider from "../../components/hook-form/FormProvider";
import { RHFTextField } from "../../components/hook-form";
import RHFAutocomplete from "../../components/hook-form/RHFAutocomplete";
import {
  FetchAllUsers,
  FetchFriends,
  FetchUsers,
  showSnackbar,
} from "../../redux/slices/app";
import { FetchDirectConversations } from "../../redux/slices/Conversation";
import { socket } from "../../socket";
import { getMockAvatar } from "../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CreateGroupForm = ({ handleClose }) => {
  const dispatch = useDispatch();
  const [memberInput, setMemberInput] = useState("");
  const {
    all_users = [],
    friends = [],
    users = [],
    user,
  } = useSelector((state) => state.app);
  const { conversations = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    dispatch(FetchAllUsers());
    dispatch(FetchFriends());
    dispatch(FetchUsers());

    const user_id = window.localStorage.getItem("user_id");
    if (user_id && socket && socket.connected) {
      socket.emit("get_direct_conversations", { user_id }, (data) => {
        if (Array.isArray(data)) {
          dispatch(FetchDirectConversations({ conversations: data }));
        }
      });
    }
  }, [dispatch]);

  const memberOptions = React.useMemo(() => {
    const nameSet = new Set();

    // 1. Real users from conversations (active chats)
    (conversations || []).forEach((conv) => {
      const convName = (conv?.name || "").trim();
      if (convName) nameSet.add(convName);
    });

    // 2. Real friends from backend
    (friends || []).forEach((f) => {
      const fullName = `${f?.firstName || ""} ${f?.lastName || ""}`.trim();
      if (fullName) nameSet.add(fullName);
    });

    // 3. Real verified users from backend
    (all_users || []).forEach((u) => {
      const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
      if (fullName) nameSet.add(fullName);
    });

    (users || []).forEach((u) => {
      const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
      if (fullName) nameSet.add(fullName);
    });

    // 4. Current logged-in user (if not already present)
    if (user?.firstName) {
      const myName = `${user.firstName} ${user.lastName || ""}`.trim();
      if (myName) nameSet.add(myName);
    }

    return Array.from(nameSet);
  }, [all_users, friends, users, conversations, user]);

  const NewGroupSchema = Yup.object().shape({
    title: Yup.string()
      .trim()
      .required("Group title is required")
      .max(64, "Group title cannot exceed 64 characters"),
    members: Yup.array().nullable(),
  });

  const defaultValues = {
    title: "",
    members: [],
  };

  const methods = useForm({
    resolver: yupResolver(NewGroupSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = async (data) => {
    try {
      const title = (data?.title || "").trim();
      if (!title) {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Please enter a group title",
          })
        );
        return;
      }

      // Collect members: from array + any pending text user typed without hitting Enter
      let membersList = Array.isArray(data.members) ? [...data.members] : [];
      if (memberInput && memberInput.trim()) {
        const pending = memberInput.trim();
        if (!membersList.includes(pending)) {
          membersList.push(pending);
        }
      }

      const newGroup = {
        id: `group_${Date.now()}`,
        img: getMockAvatar(title),
        name: title,
        msg:
          membersList.length > 0
            ? `Members: ${membersList.join(", ")}`
            : "Group created",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unread: 0,
        pinned: false,
        online: true,
      };

      const existing = JSON.parse(
        localStorage.getItem("trackon_custom_groups") || "[]"
      );
      const updated = [newGroup, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem("trackon_custom_groups", JSON.stringify(updated));

      window.dispatchEvent(new CustomEvent("groups_updated"));
      dispatch(
        showSnackbar({
          severity: "success",
          message: `Group "${title}" created successfully!`,
        })
      );
      reset();
      setMemberInput("");
      handleClose();
    } catch (error) {
      console.error("Create group error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to create group. Please try again.",
        })
      );
    }
  };

  const onError = (errors) => {
    const errorMsg =
      errors.title?.message ||
      errors.members?.message ||
      "Please enter a valid group title";
    dispatch(showSnackbar({ severity: "warning", message: errorMsg }));
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit, onError)}>
      <Stack spacing={3} sx={{ pt: 1 }}>
        <RHFTextField
          name="title"
          label="Group Title"
          placeholder="e.g. My Awesome Group"
          autoFocus
        />
        <RHFAutocomplete
          name="members"
          label="Members (optional)"
          placeholder="Select or type members..."
          multiple
          freeSolo
          options={memberOptions}
          inputValue={memberInput}
          onInputChange={(event, newInputValue) => {
            setMemberInput(newInputValue);
          }}
          ChipProps={{ size: "medium" }}
        />
        <Stack
          spacing={2}
          direction={"row"}
          alignItems="center"
          justifyContent={"end"}
        >
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ px: 3, fontWeight: 600 }}
          >
            Create
          </Button>
        </Stack>
      </Stack>
    </FormProvider>
  );
};

const CreateGroup = ({ open, handleClose }) => {
  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby="alert-dialog-slide-description"
      sx={{
        "& .MuiDialog-paper": {
          m: { xs: 1.5, sm: 3 },
          width: "100%",
          maxWidth: "450px",
        },
      }}
    >
      <DialogTitle>{"Create New Group"}</DialogTitle>

      <DialogContent sx={{ mt: 1 }}>
        {/* Create Group Form */}
        <CreateGroupForm handleClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroup;
