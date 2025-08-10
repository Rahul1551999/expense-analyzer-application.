import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, Button, Paper, Typography, Grid, Link, Box, Avatar,
  CircularProgress
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import AuthContext from '../../contexts/AuthContext';
import { registerUser } from '../../services/api'; // Import specific API method


const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };
 const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) errors.push('Full name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Please enter a valid email');
    if (formData.password.length < 8) errors.push('Password must be at least 8 characters');
    if (formData.password !== formData.confirmPassword) errors.push('Passwords do not match');
    
    if (errors.length) {
      setError(errors.join('. '));
      return false;
    }
    return true;
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  setLoading(true);
    try {
      const { token, user } = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });


     localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      login(token, user);
      navigate('/dashboard');
    }  catch (err) {
     setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
};

  return (
    <Grid container justifyContent="center" style={{ marginTop: '50px' }}>
      <Grid item xs={12} sm={8} md={6} lg={4}>
        <Paper elevation={3} style={{ padding: '30px' }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <PersonAdd />
            </Avatar>
            <Typography component="h1" variant="h5">
              Sign up
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
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              margin="normal"
              required
              autoFocus
              disabled={loading}
            />
            
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
            />
            
            <TextField
              fullWidth
              label="Password (min 8 characters)"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
            />
            
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              style={{ margin: '24px 0 16px' }}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Registering...' : 'Sign Up'}
            </Button>
            
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/login" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default Register;