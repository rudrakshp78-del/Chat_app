import {
  Box,
  Stack,
  Typography,
  Link,
  IconButton,
  Divider,
} from "@mui/material";
import React, { useState } from "react";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { MagnifyingGlass, Plus } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { ChatList } from "../../data";
import ChatElement from "../../components/ChatElement";
import CreateGroup from "../../sections/dashboard/CreateGroup";

const Group = () => {
  const theme = useTheme();
  const [openDialog, setOpenDialog] = useState(false);

   const handleCloseDailog = () => {
    setOpenDialog(false);
  }

  return (
    <>
      <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
        {/* left */}
        <Box
          sx={{
            height: "100%",
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.paper,
            width: { xs: "100%", md: 320 },
            boxShadow: { xs: "none", md: "0px 0px 2px rgba(0, 0, 0, 0.25)" },
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack p={{ xs: 2, sm: 3 }} spacing={2} sx={{ height: "100%", flex: 1, minHeight: 0 }}>
            <Stack>
              <Typography variant="h5">Groups</Typography>
            </Stack>
            <Stack sx={{ width: "100%" }}>
              <Search>
                <SearchIconWrapper>
                  <MagnifyingGlass color="#709CE6" />
                </SearchIconWrapper>

                <StyledInputBase
                  placeholder="Search..."
                  inputProps={{
                    "aria-label": "search",
                  }}
                />
              </Search>
            </Stack>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems={"center"}
            >
              <Typography variant="subtitle2" component={Link}>
                Create New Group
              </Typography>
              <IconButton onClick={() => {
                setOpenDialog(true);
              }}>
                <Plus style={{ color: theme.palette.primary.main }} />
              </IconButton>
            </Stack>
            <Divider />
            <Stack spacing={3} sx={{ flexGrow: 1, overflowY: "scroll", height: "100%" }}>
              <SimpleBarStyle timeout={500} clickOnTrack={false}>
                <Stack>
                  {/*  */}
                  <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                    Pinned
                  </Typography>
                  {/* Chat List */}
                  {ChatList.filter((el) => el.pinned).map((el) => (
                    <ChatElement key={el.id} {...el} />
                  ))}
                      {/*  */}
                   <Typography variant="subtitle2" sx={{ color: "#676667" }}>
                    All Groups
                  </Typography>
                  {/* Chat List */}
                  {ChatList.filter((el) => !el.pinned).map((el) => (
                    <ChatElement key={el.id} {...el} />
                  ))}
                </Stack>
          
              </SimpleBarStyle>
            </Stack>
          </Stack>
        </Box>
        {/* right */}
        {/* // TODO => Reuse Conversation components */}
      </Stack>
       {openDialog && <CreateGroup open={openDialog} handleClose={handleCloseDailog}/>}

    </>
  );
};


export default Group;
