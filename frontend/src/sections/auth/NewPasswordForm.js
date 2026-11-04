import { useState } from 'react';
import * as Yup from 'yup';
// form
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
// @mui
import {
  Box,
  Stack,
  IconButton,
  InputAdornment,
  Button,
  Typography,
  LinearProgress,
} from '@mui/material';
// components
import FormProvider, { RHFTextField } from '../../components/hook-form';
import { Check, Eye, EyeSlash, X } from 'phosphor-react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { NewPassword } from '../../redux/slices/auth';

// ----------------------------------------------------------------------

export default function NewPasswordForm() {
  const dispatch = useDispatch();
  const [queryParameters] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const VerifyCodeSchema = Yup.object().shape({
    password: Yup.string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters long')
      .matches(/[a-zA-Z]/, 'Password must include at least one letter (a-z, A-Z)')
      .matches(/[0-9]/, 'Password must include at least one number (0-9)')
      .matches(
        /[^a-zA-Z0-9]/,
        'Password must be strong: include numbers, letters, and special characters (!@#$%...)'
      ),
    passwordConfirm: Yup.string()
      .required('Confirm password is required')
      .oneOf([Yup.ref('password'), null], 'Passwords must match'),
  });

  const defaultValues = {
    password: '',
    passwordConfirm: '',
  };

  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(VerifyCodeSchema),
    defaultValues,
  });

  const { handleSubmit, watch } = methods;

  const passwordValue = watch('password') || '';

  const hasMinLength = passwordValue.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passwordValue);

  const passedCount = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColor =
    passedCount <= 1 ? '#EF4444' : passedCount <= 3 ? '#F59E0B' : '#10B981';
  const strengthLabel =
    passedCount <= 1 ? 'Weak' : passedCount <= 3 ? 'Medium' : 'Strong';

  const onSubmit = async (data) => {
    try {
      // Send API Request
      dispatch(NewPassword({ ...data, token: queryParameters.get('token') }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <Box>
          <RHFTextField
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <Eye /> : <EyeSlash />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {passwordValue.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'light'
                    ? 'rgba(0,0,0,0.03)'
                    : 'rgba(255,255,255,0.05)',
                border: '1px solid',
                borderColor: (theme) =>
                  passedCount === 4
                    ? 'success.main'
                    : theme.palette.mode === 'light'
                    ? 'rgba(0,0,0,0.08)'
                    : 'rgba(255,255,255,0.12)',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={0.75}
              >
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Password Strength:{' '}
                  <span style={{ color: strengthColor }}>{strengthLabel}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {passedCount}/4 requirements met
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={(passedCount / 4) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  mb: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'light'
                      ? 'rgba(0,0,0,0.06)'
                      : 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: strengthColor,
                    borderRadius: 3,
                  },
                }}
              />

              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasMinLength ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasMinLength ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: hasMinLength ? 600 : 400 }}
                  >
                    At least 8 characters
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasNumber ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasNumber ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: hasNumber ? 600 : 400 }}
                  >
                    At least one number (0-9)
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasLetter ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasLetter ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: hasLetter ? 600 : 400 }}
                  >
                    At least one letter (a-z, A-Z)
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.75}>
                  {hasSpecial ? (
                    <Check size={14} color="#10B981" weight="bold" />
                  ) : (
                    <X size={14} color="#EF4444" weight="bold" />
                  )}
                  <Typography
                    variant="caption"
                    color={hasSpecial ? 'text.primary' : 'text.secondary'}
                    sx={{ fontWeight: hasSpecial ? 600 : 400 }}
                  >
                    At least one special character (!@#$%^&*...)
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}
        </Box>

        <RHFTextField
          name="passwordConfirm"
          label="Confirm New Password"
          type={showPassword ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <Eye /> : <EyeSlash />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          fullWidth
          size="large"
          type="submit"
          variant="contained"
          sx={{
            mt: 3,
            bgcolor: 'text.primary',
            color: (theme) =>
              theme.palette.mode === 'light' ? 'common.white' : 'grey.800',
            '&:hover': {
              bgcolor: 'text.primary',
              color: (theme) =>
                theme.palette.mode === 'light' ? 'common.white' : 'grey.800',
            },
          }}
        >
          Submit
        </Button>
      </Stack>
    </FormProvider>
  );
}
