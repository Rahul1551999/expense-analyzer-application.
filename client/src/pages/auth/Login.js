import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, Button, Paper, Typography, Grid, Link, Box, Avatar 
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import AuthContext from '../../contexts/AuthContext';
import api from '../../services/api';
import { loginUser } from '../../services/api'; // Add this import
const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  
  try {
    const response = await api.post('/user/login', {
      email: formData.email,
      password: formData.password
    });

    if (!response.data?.token || !response.data?.user) {
      throw new Error('Invalid login response');
    }
 localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Store token and redirect immediately
    await auth.login(response.data.token, response.data.user);
    
    // Force navigation - add timeout if needed
        navigate('/dashboard', { replace: true });

  } catch (err) {
    console.error('Login error:', err);
    setError(err.response?.data?.message || 'Invalid email or password');
  }
};
  // Add a check for auth context
  if (!auth) {
    return <div>Loading authentication...</div>;
  }

  return (
    <Grid container justifyContent="center" style={{ marginTop: '50px' }}>
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Paper elevation={3} style={{ padding: '30px' }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlined />
            </Avatar>
            <Typography component="h1" variant="h5">
              Sign in
            </Typography>
          </Box>
          
          {error && (
            <Typography color="error" align="center" style={{ margin: '20px 0' }}>
              {error}
            </Typography>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              style={{ margin: '24px 0 16px' }}
            >
              Sign In
            </Button>
            
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/register" variant="body2">
                  Don't have an account? Sign Up
                </Link>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Login;