import React, { useEffect } from "react";
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
import { FetchAllUsers, showSnackbar } from "../../redux/slices/app";
import { getMockAvatar } from "../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const FALLBACK_MEMBERS = [
  "Aarav Sharma",
  "Priya Patel",
  "Rohan Verma",
  "Ananya Gupta",
  "Vikram Singh",
  "Neha Joshi",
];

const CreateGroupForm = ({ handleClose }) => {
  const dispatch = useDispatch();
  const { all_users = [] } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(FetchAllUsers());
  }, [dispatch]);

  const memberOptions = React.useMemo(() => {
    const names = all_users
      .map((u) => `${u?.firstName || ""} ${u?.lastName || ""}`.trim())
      .filter(Boolean);
    return names.length > 0 ? Array.from(new Set(names)) : FALLBACK_MEMBERS;
  }, [all_users]);

  const NewGroupSchema = Yup.object().shape({
    title: Yup.string().required("Title is required"),
    members: Yup.array().min(2, "Must have at least 2 members"),
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
  } = methods;

  const onSubmit = async (data) => {
    try {
      const newGroup = {
        id: `group_${Date.now()}`,
        img: getMockAvatar(data.title),
        name: data.title.trim(),
        msg: `Members: ${data.members.join(", ")}`,
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
      localStorage.setItem(
        "trackon_custom_groups",
        JSON.stringify([newGroup, ...existing])
      );
      window.dispatchEvent(new CustomEvent("groups_updated"));
      dispatch(
        showSnackbar({
          severity: "success",
          message: `Group "${data.title.trim()}" created!`,
        })
      );
      reset();
      handleClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3} sx={{ pt: 1 }}>
        <RHFTextField name="title" label="Group Title" />
        <RHFAutocomplete
          name="members"
          label="Members"
          multiple
          freeSolo
          options={memberOptions}
          ChipProps={{ size: "medium" }}
        />
        <Stack
          spacing={2}
          direction={"row"}
          alignItems="center"
          justifyContent={"end"}
        >
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained">
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
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 3 }, width: "100%", maxWidth: "450px" } }}
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