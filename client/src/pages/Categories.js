import React, { useState, useEffect } from 'react';
import { 
  Button, TextField, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Dialog, DialogTitle, 
  DialogContent, DialogActions 
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentCategory({
      categoryId: null,
      categoryName: '',
      description: ''
    });
    setIsEdit(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (category) => {
    setCurrentCategory(category);
    setIsEdit(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    setCurrentCategory({
      ...currentCategory,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await api.put(`/categories/${currentCategory.categoryId}`, currentCategory);
      } else {
        await api.post('/categories', currentCategory);
      }
      fetchCategories();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
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
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Dialog open={openDialog} onClose={handleCloseDialog}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Categories;