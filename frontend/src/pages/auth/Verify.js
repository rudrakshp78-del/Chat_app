import { Typography,  Stack  } from "@mui/material";
import React  from "react";
import VerifyForm from "../../sections/auth/VerifyForm";

const Verify = () => {
    return (
        <>
        <Stack spacing={2} sx={{ mb: 5, position: "relative" }}>

            <Typography variant="h4">Please Verify OTP</Typography>

            <Stack direction={"row"} spacing={0.5}>
                <Typography>
                    Sent to email (rudrakshp78@gmail.com)
                </Typography>
            </Stack>
        </Stack>
        {/* verify form */}
        <VerifyForm />
        </>
    );
};

export default Verify