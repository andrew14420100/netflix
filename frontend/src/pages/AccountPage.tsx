import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";

const API_URL = "";

interface User {
  id: string;
  email: string;
  name: string;
  profileImage: string | null;
}

interface HistoryItem {
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string;
  added_at: string;
}

export function Component() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Login/Register states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const token = localStorage.getItem("user_token");

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      setIsLoggedIn(true);
    } else {
      setLoading(false);
      setIsLoggedIn(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem("user_token");
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUser(data);
      setName(data.name);
      setEmail(data.email);
      setIsLoggedIn(true);

      // Fetch history
      fetchHistory();
    } catch (err) {
      setError("Errore nel caricamento del profilo");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleLogin = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Credenziali non valide");
      }

      const data = await response.json();
      localStorage.setItem("user_token", data.token);
      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setIsLoggedIn(true);
      setSuccess("Accesso effettuato!");
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Errore nella registrazione");
      }

      const data = await response.json();
      localStorage.setItem("user_token", data.token);
      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setIsLoggedIn(true);
      setSuccess("Registrazione completata!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);

    try {
      const updates: any = {};
      if (name !== user?.name) updates.name = name;
      if (email !== user?.email) updates.email = email;
      if (password) updates.password = password;

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Errore nell'aggiornamento");
      }

      const data = await response.json();
      setUser(data);
      setPassword("");
      setEditMode(false);
      setSuccess("Profilo aggiornato!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_token");
    setUser(null);
    setIsLoggedIn(false);
    setSuccess("Logout effettuato");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#141414"
      >
        <CircularProgress sx={{ color: "#e50914" }} />
      </Box>
    );
  }

  // Login/Register Form
  if (!isLoggedIn) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#141414",
          pt: 12,
          pb: 8,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            sx={{
              bgcolor: "rgba(0,0,0,0.75)",
              p: 4,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              color="#fff"
              mb={4}
              textAlign="center"
            >
              {isRegisterMode ? "Registrati" : "Accedi"}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {isRegisterMode ? (
              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  label="Nome"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  fullWidth
                  variant="filled"
                  sx={{ bgcolor: "#333" }}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  fullWidth
                  variant="filled"
                  sx={{ bgcolor: "#333" }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  fullWidth
                  variant="filled"
                  sx={{ bgcolor: "#333" }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleRegister}
                  disabled={saving}
                  sx={{
                    bgcolor: "#e50914",
                    py: 1.5,
                    "&:hover": { bgcolor: "#b20710" },
                  }}
                >
                  {saving ? <CircularProgress size={24} /> : "Registrati"}
                </Button>
                <Typography color="grey.400" textAlign="center">
                  Hai già un account?{" "}
                  <Button
                    sx={{ color: "#e50914" }}
                    onClick={() => setIsRegisterMode(false)}
                  >
                    Accedi
                  </Button>
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  label="Email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  fullWidth
                  variant="filled"
                  sx={{ bgcolor: "#333" }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  fullWidth
                  variant="filled"
                  sx={{ bgcolor: "#333" }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleLogin}
                  disabled={saving}
                  sx={{
                    bgcolor: "#e50914",
                    py: 1.5,
                    "&:hover": { bgcolor: "#b20710" },
                  }}
                >
                  {saving ? <CircularProgress size={24} /> : "Accedi"}
                </Button>
                <Typography color="grey.400" textAlign="center">
                  Nuovo su Netflix?{" "}
                  <Button
                    sx={{ color: "#e50914" }}
                    onClick={() => setIsRegisterMode(true)}
                  >
                    Registrati
                  </Button>
                </Typography>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }

  // Logged in - Profile Page
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#141414",
        pt: 12,
        pb: 8,
      }}
      data-testid="account-page"
    >
      <Container maxWidth="md">
        <Typography variant="h3" fontWeight={700} color="#fff" mb={4}>
          Il Mio Account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Paper
          sx={{
            bgcolor: "rgba(30,30,30,0.8)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, v) => setTabValue(v)}
            sx={{
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              "& .MuiTab-root": { color: "grey.400" },
              "& .Mui-selected": { color: "#e50914" },
              "& .MuiTabs-indicator": { bgcolor: "#e50914" },
            }}
          >
            <Tab icon={<PersonIcon />} label="Profilo" />
            <Tab icon={<HistoryIcon />} label="Cronologia" />
          </Tabs>

          {/* Profile Tab */}
          {tabValue === 0 && (
            <Box p={4}>
              <Box display="flex" alignItems="center" gap={3} mb={4}>
                <Avatar
                  src={user?.profileImage || undefined}
                  sx={{ width: 100, height: 100, bgcolor: "#e50914" }}
                >
                  <PersonIcon sx={{ fontSize: 50 }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={600} color="#fff">
                    {user?.name}
                  </Typography>
                  <Typography color="grey.400">{user?.email}</Typography>
                </Box>
                <Box flex={1} />
                {!editMode ? (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    sx={{ color: "#e50914" }}
                  >
                    Modifica
                  </Button>
                ) : (
                  <Button
                    startIcon={<SaveIcon />}
                    variant="contained"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    sx={{ bgcolor: "#e50914", "&:hover": { bgcolor: "#b20710" } }}
                  >
                    {saving ? <CircularProgress size={20} /> : "Salva"}
                  </Button>
                )}
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 4 }} />

              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  label="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editMode}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: editMode ? "#333" : "transparent",
                    },
                  }}
                />

                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editMode}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: editMode ? "#333" : "transparent",
                    },
                  }}
                />

                {editMode && (
                  <TextField
                    label="Nuova Password (lascia vuoto per non cambiare)"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#333" } }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              </Box>

              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 4 }} />

              <Button
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  color: "#e50914",
                  borderColor: "#e50914",
                  "&:hover": { bgcolor: "rgba(229,9,20,0.1)" },
                }}
                variant="outlined"
              >
                Logout
              </Button>
            </Box>
          )}

          {/* History Tab */}
          {tabValue === 1 && (
            <Box p={4}>
              <Typography variant="h6" color="#fff" mb={3}>
                La Mia Lista
              </Typography>

              {history.length === 0 ? (
                <Typography color="grey.500" textAlign="center" py={4}>
                  Nessun contenuto nella tua lista
                </Typography>
              ) : (
                <List>
                  {history.map((item) => (
                    <ListItem
                      key={`${item.media_type}-${item.media_id}`}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        navigate(`/browse/${item.media_type}/${item.media_id}`)
                      }
                    >
                      <ListItemAvatar>
                        {item.poster_path ? (
                          <Avatar
                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                            variant="rounded"
                            sx={{ width: 50, height: 75 }}
                          />
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 50, height: 75 }}>
                            {item.media_type === "movie" ? (
                              <MovieIcon />
                            ) : (
                              <TvIcon />
                            )}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.title || `ID: ${item.media_id}`}
                        secondary={
                          <>
                            {item.media_type === "movie" ? "Film" : "Serie TV"}
                            {item.added_at &&
                              ` • Aggiunto il ${new Date(
                                item.added_at
                              ).toLocaleDateString("it-IT")}`}
                          </>
                        }
                        sx={{ ml: 2 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

Component.displayName = "AccountPage";
