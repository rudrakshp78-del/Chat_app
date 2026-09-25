import { Box, IconButton, Stack, Typography } from "@mui/material";
import { CaretLeft } from "phosphor-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "../../sections/dashboard/settings/ProfileForm";

const Profile = () => {
  const navigate = useNavigate();

  return (
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
        <Stack p={{ xs: 2.5, sm: 4 }} spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems={"center"} spacing={2}>
            <IconButton onClick={() => navigate("/app")}>
              <CaretLeft size={24} color={"#4B4B4B"} />
            </IconButton>

            <Typography variant="h5">Profile</Typography>
          </Stack>

          {/* Profile form */}
          <ProfileForm />
        </Stack>
      </Box>
    </Stack>
  );
};

export default Profile;
