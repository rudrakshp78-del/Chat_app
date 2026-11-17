import React, { useEffect } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import {
  FetchFriendRequests,
  FetchFriends,
  FetchUsers,
} from "../../redux/slices/app";
import {
  FriendRequestElement,
  UserElement,
} from "../../components/UserElement";
import { FriendComponent } from "../../components/Friends";

const UsersList = () => {
  const dispatch = useDispatch();

  const { users } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(FetchUsers());
  }, [dispatch]);

  return (
    <>
      {users.map((el, idx) => {
        return <UserElement key={el._id || idx} {...el} />;
      })}
    </>
  );
};

const FriendsList = ({ handleClose }) => {
  const dispatch = useDispatch();

  const friends = useSelector((state) => state.app.friends);

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

  const { friendRequests = [] } = useSelector((state) => state.app);

  useEffect(() => {
    dispatch(FetchFriendRequests());
  }, [dispatch]);

  if (!Array.isArray(friendRequests) || friendRequests.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
        No pending friend requests
      </Typography>
    );
  }

  return (
    <>
      {friendRequests.map((el, idx) => {
        return <FriendRequestElement key={el._id || idx} {...el.sender} id={el._id} />;
      })}
    </>
  );
};

const Friends = ({ open, handleClose, initialTab = 0 }) => {
  const [value, setValue] = React.useState(initialTab);
  const { friendRequests = [] } = useSelector((state) => state.app);
  const pendingCount = Array.isArray(friendRequests) ? friendRequests.length : 0;

  useEffect(() => {
    if (open) {
      setValue(initialTab);
    }
  }, [open, initialTab]);

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
          <Tab
            label={
              <Badge
                badgeContent={pendingCount}
                color="error"
                max={99}
                sx={{ "& .MuiBadge-badge": { right: -12, top: 2 } }}
              >
                <span>Requests</span>
              </Badge>
            }
          />
        </Tabs>
      </Stack>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Stack sx={{ height: "100%" }}>
          <Stack spacing={2.5}>
            {(() => {
              switch (value) {
                case 0:
                  return <UsersList />;

                case 1:
                  return <FriendsList handleClose={handleClose} />;

                case 2:
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
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Friends;
