// client/src/layout/Sidebar.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  List, ListItemButton, ListItemIcon, ListItemText, Divider, Toolbar, Drawer, Box
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as ExpensesIcon,
  Category as CategoriesIcon,
  Assessment as ReportsIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' },
  { text: 'Categories', icon: <CategoriesIcon />, path: '/categories' },
  { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
  { text: 'Upload Receipt', icon: <UploadIcon />, path: '/upload' }
];

const SidebarContent = ({ location }) => (
  <Box sx={{ width: drawerWidth }}>
    <Toolbar />
    <Divider />
    <List>
      {menuItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <NavLink key={item.text} to={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
            <ListItemButton selected={active}>
              <ListItemIcon sx={{ color: active ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </NavLink>
        );
      })}
    </List>
  </Box>
);

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={!!open && typeof onClose === 'function'}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        <SidebarContent location={location} />
      </Drawer>

      {/* Desktop */}
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, position: 'relative' } }}
      >
        <SidebarContent location={location} />
      </Drawer>
    </>
  );
};

export default Sidebar;
