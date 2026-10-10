import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import { MagnifyingGlass } from "phosphor-react";
import { CallElement } from "../../components/CallElement";
import { useDispatch, useSelector } from "react-redux";
import {
  FetchAllUsers,
  FetchFriends,
  FetchUsers,
} from "../../redux/slices/app";
import getAvatarUrl from "../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const StartCall = ({ open, handleClose }) => {
  const {
    all_users = [],
    friends = [],
    users = [],
  } = useSelector((state) => state.app);
  const { conversations = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(FetchAllUsers());
    dispatch(FetchFriends());
    dispatch(FetchUsers());
  }, [dispatch]);

  const list = React.useMemo(() => {
    const contactMap = new Map();

    // 1. Add from direct conversations
    (conversations || []).forEach((c) => {
      const uid = c?.user_id || c?.id;
      if (uid && c?.name) {
        contactMap.set(String(uid), {
          id: uid,
          name: c.name,
          img: getAvatarUrl(c.img, c.name),
          online: Boolean(c.online),
        });
      }
    });

    // 2. Add from friends, all_users, and users
    [...(friends || []), ...(all_users || []), ...(users || [])].forEach((el) => {
      if (!el?._id) return;
      const uid = String(el._id);
      const name = `${el?.firstName || ""} ${el?.lastName || ""}`.trim() || "User";
      if (!contactMap.has(uid)) {
        contactMap.set(uid, {
          id: el._id,
          name,
          img: getAvatarUrl(el?.avatar, el?.firstName),
          online: el?.status === "Online",
        });
      }
    });

    return Array.from(contactMap.values()).filter((item) =>
      !searchQuery.trim()
        ? true
        : item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [all_users, friends, users, conversations, searchQuery]);

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
      <DialogTitle>{"Start New Call"}</DialogTitle>
      <Stack px={3} pb={1} sx={{ width: "100%" }}>
        <Search>
          <SearchIconWrapper>
            <MagnifyingGlass color="#709CE6" />
          </SearchIconWrapper>
          <StyledInputBase
            placeholder="Search contacts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputProps={{ "aria-label": "search" }}
          />
        </Search>
      </Stack>
      <DialogContent>
        <Stack sx={{ height: "100%" }}>
          <Stack spacing={2.4}>
            {list.length > 0 ? (
              list.map((el, idx) => (
                <CallElement
                  key={el.id || idx}
                  {...el}
                  handleClose={handleClose}
                />
              ))
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 3 }}
              >
                No contacts found
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default StartCall;