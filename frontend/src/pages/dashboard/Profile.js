import React, { useState } from "react";
import { Box, Button, Divider, IconButton, Stack, Typography } from "@mui/material";
import { CaretLeft, SignOut } from "phosphor-react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "../../sections/dashboard/settings/ProfileForm";
import LogoutDialog from "../../components/LogoutDialog";

const Profile = () => {
  const navigate = useNavigate();
  const [openLogout, setOpenLogout] = useState(false);

  return (
    <>
      <Stack direction="row" sx={{ width: "100%", height: "100%" }}>
        <Box
          sx={{
            height: "100%",
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background.paper,
            width: { xs: "100%", md: 360 },
            boxShadow: { xs: "none", md: "0px 0px 2px rgba(0, 0, 0, 0.25)" },
            overflowY: "auto",
          }}
        >
          <Stack
            pt={{ xs: 1, sm: 2.5 }}
            px={{ xs: 2, sm: 4 }}
            spacing={{ xs: 2, sm: 3 }}
          >
            {/* Header */}
            <Stack direction="row" alignItems={"center"} spacing={2}>
              <IconButton onClick={() => navigate("/app")}>
                <CaretLeft size={24} color={"#4B4B4B"} />
              </IconButton>

              <Typography variant="h5">Profile</Typography>
            </Stack>

            {/* Profile form */}
            <ProfileForm />

            {/* Logout Section */}
            <Divider sx={{ my: 1 }} />
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<SignOut size={20} weight="bold" />}
              onClick={() => setOpenLogout(true)}
              sx={{
                py: 1.25,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                borderColor: "error.main",
                "&:hover": {
                  bgcolor: (theme) => `${theme.palette.error.main}14`,
                  borderColor: "error.dark",
                },
              }}
            >
              Log Out
            </Button>
          </Stack>
        </Box>
      </Stack>

      <LogoutDialog
        open={openLogout}
        handleClose={() => setOpenLogout(false)}
      />
    </>
  );
};

export default Profile;
