// src/pages/Settings.js
import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, CardHeader, CircularProgress,
  Grid, IconButton, Stack, TextField, Typography, Alert
} from '@mui/material';
import { PhotoCamera, Delete, Save } from '@mui/icons-material';
import api from '../services/api';

const Settings = () => {
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(''); // remote URL
  const [avatarFile, setAvatarFile] = useState(null); // local file
  const [avatarPreview, setAvatarPreview] = useState(''); // preview data URL

  // load current profile
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/me'); // expected { name, age, avatarUrl }
        const d = res?.data || {};
        setName(d.name || '');
        setAge(d.age ?? '');
        setAvatarUrl(d.avatarUrl || '');
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // handle image choose
  const onPickImage = () => fileInputRef.current?.click();
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // basic checks
    if (!/^image\//.test(file.type)) {
      setError('Please choose an image file (PNG/JPEG).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) { // 3MB
      setError('Image is too large (max 3MB).');
      return;
    }
    setError('');
    setAvatarFile(file);

    // preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    // keep existing avatarUrl; we’ll allow clearing on save with special flag if desired
  };

  const validate = () => {
    if (!name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (age !== '' && (!/^\d+$/.test(String(age)) || Number(age) < 0 || Number(age) > 120)) {
      setError('Age must be a number between 0 and 120.');
      return false;
    }
    setError('');
    return true;
  };

  const onSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setSuccess('');
      // 1) upload avatar if a new file was chosen
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const up = await api.post('/me/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        newAvatarUrl = up?.data?.avatarUrl || newAvatarUrl;
        setAvatarUrl(newAvatarUrl);
      }

      // 2) save basic profile
      await api.put('/me', {
        name: name.trim(),
        age: age === '' ? null : Number(age),
        // optionally send avatarUrl if your API expects it here:
        avatarUrl: newAvatarUrl,
      });

      setSuccess('Profile updated!');
      setAvatarFile(null);
      setAvatarPreview('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>

      <Card>
        <CardHeader title="Profile" subheader="Update your basic information" />
        <CardContent>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1} alignItems="center">
                  <Avatar
                    src={avatarPreview || avatarUrl || undefined}
                    alt={name || 'Profile'}
                    sx={{ width: 120, height: 120, fontSize: 40 }}
                  >
                    {name ? name[0]?.toUpperCase() : 'U'}
                  </Avatar>

                  <Stack direction="row" spacing={1}>
                    <Button
                      startIcon={<PhotoCamera />}
                      onClick={onPickImage}
                      variant="outlined"
                      size="small"
                    >
                      Change Photo
                    </Button>
                    {(avatarPreview || avatarFile) && (
                      <IconButton color="error" onClick={removeAvatar} size="small" title="Remove selected">
                        <Delete />
                      </IconButton>
                    )}
                  </Stack>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onFileChange}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Age"
                      type="number"
                      inputProps={{ min: 0, max: 120, step: 1 }}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} /> : <Save />}
                onClick={onSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
