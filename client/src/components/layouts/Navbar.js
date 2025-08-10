import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, Box, 
  Menu, MenuItem, IconButton, Avatar 
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { AccountCircle, Settings, ExitToApp } from '@mui/icons-material';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Expense Analyzer
        </Typography>
        
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
            <Button color="inherit" component={Link} to="/expenses">Expenses</Button>
            <Button color="inherit" component={Link} to="/upload">Upload</Button>
            <Button color="inherit" component={Link} to="/reports">Reports</Button>
            <Button color="inherit" component={Link} to="/categories">Categories</Button>
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleMenuOpen}
              sx={{ ml: 2 }}
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
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