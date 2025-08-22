import React, { useState, useEffect } from 'react';
import { 
  Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Dialog, DialogTitle, 
  DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({
    categoryId: null,
    categoryName: '',
    description: ''
  });
  const [isEdit, setIsEdit] = useState(false);

  // small UX bits
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      // normalize defensively (in case the backend adds fields later)
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const normalized = list.map(c => ({
        categoryId: c.categoryId ?? c.id ?? c.category_id,
        categoryName: c.categoryName ?? c.name ?? c.category_name ?? '',
        description: c.description ?? ''
      }));
      // sort by name for stable view
      normalized.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      setCategories(normalized);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentCategory({
      categoryId: null,
      categoryName: '',
      description: ''
    });
    setFormError('');
    setIsEdit(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (category) => {
    setCurrentCategory({
      categoryId: category.categoryId,
      categoryName: category.categoryName || '',
      description: category.description || ''
    });
    setFormError('');
    setIsEdit(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (saving) return; // prevent closing while saving
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    setCurrentCategory({
      ...currentCategory,
      [e.target.name]: e.target.value
    });
    setFormError('');
  };

  const handleSubmit = async () => {
    // basic validation to match backend
    const name = (currentCategory.categoryName || '').trim();
    if (!name) {
      setFormError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        categoryName: name,
        description: (currentCategory.description || '').trim() || null,
      };

      if (isEdit) {
        await api.put(`/categories/${currentCategory.categoryId}`, payload);
        // optimistic update
        setCategories(prev =>
          prev.map(c =>
            c.categoryId === currentCategory.categoryId
              ? { ...c, categoryName: payload.categoryName, description: payload.description || '' }
              : c
          ).sort((a, b) => a.categoryName.localeCompare(b.categoryName))
        );
      } else {
        const { data } = await api.post('/categories', payload);
        const newCat = {
          categoryId: data?.categoryId, // returned by backend
          categoryName: payload.categoryName,
          description: payload.description || ''
        };
        setCategories(prev =>
          [...prev, newCat].sort((a, b) => a.categoryName.localeCompare(b.categoryName))
        );
      }

      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving category:', error);
      // show friendly message if backend sends one
      setFormError(error?.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(c => c.categoryId !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      // you can surface error to user if needed
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Manage Categories</Typography>
      
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={handleOpenAddDialog}
        style={{ marginBottom: '20px' }}
      >
        Add Category
      </Button>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width={220}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CircularProgress size={18} /> Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : categories.length ? (
              categories.map((category) => (
                <TableRow key={category.categoryId}>
                  <TableCell>{category.categoryName}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <Button
                      startIcon={<Edit />}
                      onClick={() => handleOpenEditDialog(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      startIcon={<Delete />}
                      onClick={() => handleDelete(category.categoryId)}
                      color="error"
                      style={{ marginLeft: '10px' }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>No categories yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {isEdit ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="categoryName"
            label="Category Name"
            type="text"
            fullWidth
            variant="standard"
            value={currentCategory.categoryName}
            onChange={handleInputChange}
            required
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            variant="standard"
            value={currentCategory.description}
            onChange={handleInputChange}
          />
          {formError ? (
            <Typography color="error" sx={{ mt: 1 }}>{formError}</Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary" disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Categories;
