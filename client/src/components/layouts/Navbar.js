import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, Box, 
  Menu, MenuItem, IconButton, useMediaQuery, useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { AccountCircle, Settings, ExitToApp } from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar>
        {/* Sidebar toggle on mobile */}
        {!isMdUp && (
          <IconButton edge="start" color="inherit" onClick={onToggleSidebar} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Expense Analyzer
        </Typography>

        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* {isMdUp && (
              <>
                <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                <Button color="inherit" component={Link} to="/expenses">Expenses</Button>
                <Button color="inherit" component={Link} to="/upload">Upload</Button>
                <Button color="inherit" component={Link} to="/reports">Reports</Button>
                <Button color="inherit" component={Link} to="/categories">Categories</Button>
              </>
            )} */}
            <IconButton size="large" edge="end" color="inherit" onClick={handleMenuOpen} sx={{ ml: 2 }}>
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                <AccountCircle sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem component={Link} to="/settings" onClick={handleMenuClose}>
                <Settings sx={{ mr: 1 }} /> Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" component={Link} to="/login">Login</Button>
            <Button color="inherit" component={Link} to="/register">Register</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
