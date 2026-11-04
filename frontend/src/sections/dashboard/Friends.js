import React, { useEffect } from "react";
import { Button, Dialog, DialogActions, DialogContent, Divider, Slide, Stack, Tab, Tabs } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  FetchFriendRequests,
  FetchFriends,
  FetchUsers,
} from "../../redux/slices/app";
import {
  FriendElement,
  FriendRequestElement,
  UserElement,
} from "../../components/UserElement";
import { FriendComponent } from "../../components/Friends";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const UsersList = () => {
  const dispatch = useDispatch();

  const { users } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(FetchUsers());
  }, []);

  return (
    <>
      {users.map((el, idx) => {
        return <UserElement key={idx} {...el} />;
      })}
    </>
  );
};

const FriendsList = ({ handleClose }) => {
  const dispatch = useDispatch();

  const friends = useSelector((state) => state.app.friends);

  console.log("========== FRIENDS DEBUG ==========");
  console.log("friends:", friends);
  console.log("typeof:", typeof friends);
  console.log("isArray:", Array.isArray(friends));
  console.log("===================================");

  useEffect(() => {
    dispatch(FetchFriends());
  }, [dispatch]);

  if (!Array.isArray(friends)) {
    return <div>Friends data is not an array</div>;
  }

  return (
    <>
      {friends.map((el) => (
        <FriendComponent
          key={el._id}
          {...el}
          handleClose={handleClose}
        />
      ))}
    </>
  );
};


const FriendRequestsList = () => {
  const dispatch = useDispatch();

  const { friendRequests } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(FetchFriendRequests());
  }, []);

  return (
    <>
      {friendRequests.map((el, idx) => {
        return <FriendRequestElement key={idx} {...el.sender} id={el._id} />;
      })}
    </>
  );
};

const Friends = ({ open, handleClose }) => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      onClose={handleClose}
      sx={{ "& .MuiDialog-paper": { m: { xs: 1.5, sm: 3 }, width: "100%", maxWidth: "450px" } }}
    >
      {/* <DialogTitle>{"Friends"}</DialogTitle> */}
      <Stack px={2} pt={2} pb={1} sx={{ width: "100%" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="fullWidth"
          sx={{
            width: "100%",
            "& .MuiTab-root": {
              minWidth: 0,
              padding: "10px 8px",
              fontWeight: 600,
              fontSize: { xs: "0.85rem", sm: "0.925rem" },
              textTransform: "none",
              "&:not(:last-of-type)": {
                marginRight: 0,
              },
            },
          }}
        >
          <Tab label="Explore" />
          <Tab label="Friends" />
          <Tab label="Requests" />
        </Tabs>
      </Stack>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Stack sx={{ height: "100%" }}>
          <Stack spacing={2.5}>
            {(() => {
              switch (value) {
                case 0: // display all users in this list
                  return <UsersList />;

                case 1: // display friends in this list
                  return <FriendsList handleClose={handleClose} />;

                case 2: // display request in this list
                  return <FriendRequestsList />;

                default:
                  break;
              }
            })()}
          </Stack>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: "flex-end" }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            py: 0.65,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Friends;
