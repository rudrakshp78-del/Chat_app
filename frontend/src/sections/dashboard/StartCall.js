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
import { FetchAllUsers } from "../../redux/slices/app";
import getAvatarUrl from "../../utils/getAvatarUrl";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const StartCall = ({ open, handleClose }) => {
  const { all_users = [] } = useSelector((state) => state.app);
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(FetchAllUsers());
  }, [dispatch]);

  const list = all_users
    .map((el) => ({
      id: el?._id,
      name: `${el?.firstName || ""} ${el?.lastName || ""}`.trim() || "User",
      img: getAvatarUrl(el?.avatar, el?.firstName),
      online: el?.status === "Online",
    }))
    .filter((item) =>
      !searchQuery.trim()
        ? true
        : item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

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
                <CallElement key={el.id || idx} {...el} handleClose={handleClose} />
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