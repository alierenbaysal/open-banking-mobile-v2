import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Stepper,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Group,
  Anchor,
  ThemeIcon,
  Box,
  List,
  CopyButton,
  ActionIcon,
  Tooltip,
  Center,
  Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconUserCheck,
  IconCheck,
  IconCopy,
  IconLock,
  IconDeviceMobile,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../utils/api';

interface VerifyPinResponse {
  ticket: string;
  email: string;
  name: string;
}

interface TotpInitResponse {
  secret: string;
  otpauth_uri: string;
}

function errorCode(err: ApiError): string {
  const body = err.body;
  if (body && typeof body === 'object' && 'error' in body) {
    return String((body as Record<string, unknown>).error);
  }
  return '';
}

// Password rule: >=12 chars, with upper + lower + digit.
function passwordIssues(pw: string): string[] {
  const issues: string[] = [];
  if (pw.length < 12) issues.push('At least 12 characters');
  if (!/[A-Z]/.test(pw)) issues.push('An uppercase letter');
  if (!/[a-z]/.test(pw)) issues.push('A lowercase letter');
  if (!/\d/.test(pw)) issues.push('A digit');
  return issues;
}

export default function ActivatePage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — PIN verification
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [ticket, setTicket] = useState('');
  const [name, setName] = useState('');

  // Step 2 — password
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Step 3 — TOTP
  const [totp, setTotp] = useState<TotpInitResponse | null>(null);
  const [code, setCode] = useState('');

  const pwIssues = passwordIssues(password);

  const handleVerifyPin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<VerifyPinResponse>('/portal-api/auth/verify-pin', {
        email: email.trim(),
        pin: pin.trim(),
      });
      setTicket(res.data.ticket);
      setName(res.data.name);
      setStep(1);
    } catch (err) {
      const ec = errorCode(err as ApiError);
      if (ec === 'pin_expired') {
        setError('This PIN has expired. Please ask your administrator to send a new invitation.');
      } else {
        setError('The email or PIN is incorrect. Please check your invitation email and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pwIssues.length > 0 || password !== confirm) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/portal-api/auth/set-password', { ticket, password });
      // Initialise TOTP enrolment for the next step.
      const init = await api.post<TotpInitResponse>('/portal-api/auth/totp/init', { ticket });
      setTotp(init.data);
      setStep(2);
    } catch (err) {
      const ec = errorCode(err as ApiError);
      if (ec === 'weak_password') {
        setError('That password does not meet the requirements. Please choose a stronger one.');
      } else {
        setError('Could not set your password. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyTotp = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/portal-api/auth/totp/verify', { ticket, code: code.trim() });
      // Cookie is now set by the BFF — hydrate the session and go.
      await refresh();
      notifications.show({
        title: 'Account activated',
        message: 'Welcome to Qantara. Your account is ready.',
        color: 'green',
      });
      navigate('/applications');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401 || errorCode(apiErr) === 'invalid_code') {
        setError('That code is incorrect or has expired. Please try the latest code from your app.');
      } else {
        setError('Could not verify the code. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container size={520} py={48}>
      <Stack align="center" gap="lg">
        <Box ta="center">
          <ThemeIcon size={56} radius="xl" color="bankGreen" variant="light" mb="sm">
            <IconUserCheck size={28} />
          </ThemeIcon>
          <Title order={2}>Activate your account</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Complete these three steps using the invitation sent to your email.
          </Text>
        </Box>

        <Card withBorder w="100%" p="xl">
          <Stepper active={step} color="bankGreen" size="sm" mb="xl">
            <Stepper.Step label="Verify" description="Email & PIN" icon={<IconUserCheck size={16} />} />
            <Stepper.Step label="Password" description="Set a password" icon={<IconLock size={16} />} />
            <Stepper.Step label="Authenticator" description="Enrol app" icon={<IconDeviceMobile size={16} />} />
          </Stepper>

          {error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} mb="md">
              {error}
            </Alert>
          )}

          {/* Step 1 — PIN */}
          {step === 0 && (
            <form onSubmit={handleVerifyPin}>
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  Enter the email address you were invited with and the PIN from that email.
                </Text>
                <TextInput
                  label="Email"
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <TextInput
                  label="Invitation PIN"
                  placeholder="Enter the PIN from your email"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.currentTarget.value)}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={busy}
                  disabled={!email.trim() || !pin.trim()}
                >
                  Verify PIN
                </Button>
              </Stack>
            </form>
          )}

          {/* Step 2 — Password */}
          {step === 1 && (
            <form onSubmit={handleSetPassword}>
              <Stack gap="md">
                <Text size="sm">
                  Welcome{name ? `, ${name}` : ''}. Choose a password for your account.
                </Text>
                <Box>
                  <Text size="xs" fw={600} c="dimmed" mb={4}>
                    Your password must contain:
                  </Text>
                  <List size="xs" spacing={2}>
                    <List.Item
                      icon={
                        <ThemeIcon size={14} radius="xl" color={password.length >= 12 ? 'green' : 'gray'}>
                          <IconCheck size={10} />
                        </ThemeIcon>
                      }
                    >
                      At least 12 characters
                    </List.Item>
                    <List.Item
                      icon={
                        <ThemeIcon size={14} radius="xl" color={/[A-Z]/.test(password) ? 'green' : 'gray'}>
                          <IconCheck size={10} />
                        </ThemeIcon>
                      }
                    >
                      An uppercase letter
                    </List.Item>
                    <List.Item
                      icon={
                        <ThemeIcon size={14} radius="xl" color={/[a-z]/.test(password) ? 'green' : 'gray'}>
                          <IconCheck size={10} />
                        </ThemeIcon>
                      }
                    >
                      A lowercase letter
                    </List.Item>
                    <List.Item
                      icon={
                        <ThemeIcon size={14} radius="xl" color={/\d/.test(password) ? 'green' : 'gray'}>
                          <IconCheck size={10} />
                        </ThemeIcon>
                      }
                    >
                      A digit
                    </List.Item>
                  </List>
                </Box>
                <PasswordInput
                  label="Password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Confirm password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.currentTarget.value)}
                  error={confirm.length > 0 && confirm !== password ? 'Passwords do not match' : null}
                />
                <Button
                  type="submit"
                  fullWidth
                  loading={busy}
                  disabled={pwIssues.length > 0 || password !== confirm}
                >
                  Set Password & Continue
                </Button>
              </Stack>
            </form>
          )}

          {/* Step 3 — TOTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyTotp}>
              <Stack gap="md">
                <Text size="sm">
                  Scan this QR code with an authenticator app (Google Authenticator, Microsoft
                  Authenticator, Authy, ...), then enter the 6-digit code it shows.
                </Text>

                {totp && (
                  <>
                    <Center>
                      <Paper withBorder p="md" radius="md">
                        <QRCodeSVG value={totp.otpauth_uri} size={180} />
                      </Paper>
                    </Center>

                    <Box>
                      <Text size="xs" fw={600} c="dimmed" mb={4}>
                        Can't scan? Enter this secret manually:
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <Paper
                          withBorder
                          px="sm"
                          py={6}
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}
                        >
                          {totp.secret}
                        </Paper>
                        <CopyButton value={totp.secret}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy'}>
                              <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    </Box>
                  </>
                )}

                <TextInput
                  label="Authenticator code"
                  placeholder="123456"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ''))}
                />

                <Button type="submit" fullWidth loading={busy} disabled={!/^\d{6}$/.test(code.trim())}>
                  Verify & Finish
                </Button>
              </Stack>
            </form>
          )}
        </Card>

        <Group gap={4}>
          <Text size="sm" c="dimmed">
            Already activated?
          </Text>
          <Anchor size="sm" component={Link} to="/login">
            Sign in
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
