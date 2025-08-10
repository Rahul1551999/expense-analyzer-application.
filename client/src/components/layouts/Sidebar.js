import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  styled
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as ExpensesIcon,
  Category as CategoriesIcon,
  Assessment as ReportsIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';

const StyledNavLink = styled(NavLink)(({ theme }) => ({
  textDecoration: 'none',
  color: theme.palette.text.primary,
  '&.active': {
    backgroundColor: theme.palette.action.selected,
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main
    },
    '& .MuiListItemText-primary': {
      fontWeight: 'bold'
    }
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' },
    { text: 'Categories', icon: <CategoriesIcon />, path: '/categories' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Upload Receipt', icon: <UploadIcon />, path: '/upload' }
  ];

  return (
    <div style={{ width: '240px', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <Toolbar />
      
      <List>
        {menuItems.map((item) => (
          <StyledNavLink
            key={item.text}
            to={item.path}
            style={({ isActive }) => ({
              display: 'block',
              backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
            })}
          >
            <ListItem button>
              <ListItemIcon>
                {React.cloneElement(item.icon, {
                  color: location.pathname === item.path ? 'primary' : 'inherit'
                })}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </StyledNavLink>
        ))}
      </List>
    </div>
  );
};

export default Sidebar;