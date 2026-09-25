import { Box, Divider, IconButton, Stack, Typography, Link} from '@mui/material';
import React, { useState } from 'react'
import { Search, SearchIconWrapper, StyledInputBase } from '../../components/Search';
import { MagnifyingGlass, Plus } from 'phosphor-react';
import { useTheme } from '@mui/material/styles';
import { SimpleBarStyle } from '../../components/Scrollbar';
import { CallLogElement } from "../../components/CallElement";
import { CallLogs } from '../../data';
import StartCall from "../../sections/dashboard/StartCall";







const Call = () => {
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
              <Typography variant="h5">Call Logs</Typography>
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
                Start Conversation
              </Typography>
              <IconButton onClick={() => {
                setOpenDialog(true);
              }}>
                <Plus style={{ color: (theme) => theme.palette.primary.main }} />
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
                 {/* Call Logs */}
                 {CallLogs.map((el) =>  <CallLogElement {...el} /> )}
                
                </Stack>
          
              </SimpleBarStyle>
            </Stack>
          </Stack>
        </Box>
        {/* right */}
        {/* // TODO => Reuse Conversation components */}
      </Stack>

      {openDialog && <StartCall open={openDialog} handleClose={handleCloseDailog} />}
      </>

  )
};

export default Call;
