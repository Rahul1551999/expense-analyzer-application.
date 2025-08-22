import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Box, useMediaQuery, useTheme } from '@mui/material';

const MainLayout = () => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' , m: 0, p: 0  }}>
      <Navbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' , m: 0, p: 0 }}>
        <Sidebar
          open={isMdUp ? true : sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
             m: 0,
            p: 0,
            // p: { xs: 2, md: 3 },
            // backgroundColor: '#f9f9f9',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;