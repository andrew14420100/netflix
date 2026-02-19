import * as React from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import useOffSetTop from "src/hooks/useOffSetTop";
import { APP_BAR_HEIGHT } from "src/constant";
import Logo from "../Logo";
import SearchBox from "../SearchBox";
import NetflixNavigationLink from "../NetflixNavigationLink";

const API_URL = "";

// Default menu items as fallback
const defaultPages = [
  { id: "1", name: "Home", path: "/browse", active: true },
  { id: "2", name: "Film", path: "/browse/genre/movie", active: true },
  { id: "3", name: "Serie TV", path: "/browse/genre/tv", active: true },
  { id: "4", name: "La Mia Lista", path: "/my-list", active: true },
];

const MainHeader = () => {
  const navigate = useNavigate();
  const isOffset = useOffSetTop(APP_BAR_HEIGHT);
  const [menuItems, setMenuItems] = React.useState(defaultPages);

  const [anchorElNav, setAnchorElNav] = React.useState(null);
  const [anchorElUser, setAnchorElUser] = React.useState(null);

  // Fetch dynamic menu items
  React.useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/menu`);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            setMenuItems(data.items);
          }
        }
      } catch (err) {
        // Use default menu on error
        console.log("Using default menu");
      }
    };
    fetchMenu();
  }, []);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleMenuClick = (item) => {
    handleCloseNavMenu();
    const path = item.path || item.link || '/browse';
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
  };

  const handleUserMenuClick = (setting) => {
    handleCloseUserMenu();
    if (setting === "Account") {
      navigate("/account");
    } else if (setting === "Esci") {
      localStorage.removeItem("user_token");
      window.location.reload();
    }
  };

  // Filter by 'active' field (new format) or 'visible' field (old format)
  const visibleMenuItems = menuItems.filter(item => item.active !== false && item.visible !== false);

  return (
    <AppBar
      sx={{
        px: "60px",
        height: APP_BAR_HEIGHT,
        backgroundImage: "none",
        ...(isOffset
          ? {
              bgcolor: "primary.main",
              boxShadow: (theme) => theme.shadows[4],
            }
          : { boxShadow: 0, bgcolor: "transparent" }),
      }}
    >
      <Toolbar disableGutters>
        <Logo sx={{ mr: { xs: 2, sm: 4 } }} />

        <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
          <IconButton
            size="large"
            aria-label="menu"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleOpenNavMenu}
            color="inherit"
          >
            <MenuIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorElNav}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            open={Boolean(anchorElNav)}
            onClose={handleCloseNavMenu}
            sx={{
              display: { xs: "block", md: "none" },
            }}
          >
            {visibleMenuItems.map((item) => (
              <MenuItem key={item.id} onClick={() => handleMenuClick(item)}>
                <Typography textAlign="center">{item.name || item.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
        <Typography
          variant="h5"
          noWrap
          component="a"
          href=""
          sx={{
            mr: 2,
            display: { xs: "flex", md: "none" },
            flexGrow: 1,
            fontWeight: 700,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Netflix
        </Typography>
        <Stack
          direction="row"
          spacing={3}
          sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}
        >
          {visibleMenuItems.map((item) => (
            <NetflixNavigationLink
              to={item.path || item.link || '/browse'}
              variant="subtitle1"
              key={item.id}
              onClick={(e) => {
                const path = item.path || item.link || '/browse';
                if (path.startsWith('http')) {
                  e.preventDefault();
                  window.open(path, '_blank');
                }
              }}
            >
              {item.name || item.label}
            </NetflixNavigationLink>
          ))}
        </Stack>

        <Box sx={{ flexGrow: 0, display: "flex", gap: 2 }}>
          <SearchBox />
          <Tooltip title="Impostazioni">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar alt="user_avatar" src="/avatar.png" variant="rounded" />
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: "45px" }}
            id="avatar-menu"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            {["Account", "Esci"].map((setting) => (
              <MenuItem key={setting} onClick={() => handleUserMenuClick(setting)}>
                <Typography textAlign="center">{setting}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default MainHeader;