import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, TextField, Button, IconButton, Typography, Grid, Select, MenuItem 
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
import api from '../../services/api';
import { InputAdornment } from '@mui/material';
const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, categoriesRes] = await Promise.all([
          api.get('/expenses'),
          api.get('/categories')
        ]);
      // normalize shapes
       const expenseList =
         Array.isArray(expensesRes.data)
           ? expensesRes.data
           : expensesRes.data?.expenses ||
             expensesRes.data?.data ||
             [];

       const categoryList =
         Array.isArray(categoriesRes.data)
           ? categoriesRes.data
           : categoriesRes.data?.categories ||
             categoriesRes.data?.data ||
             [];

       // optional: map to a consistent schema so the table never breaks
      const normalized = expenseList.map(e => ({
         expenseId: e.expenseId ?? e.id ?? e.expense_id,
         transactionDate: e.transactionDate ?? e.date ?? e.date_tx ?? e.createdAt,
         merchant: e.merchant ?? e.vendor ?? '',
         description: e.description ?? '',
         amount: Number(e.amount ?? 0),
         categoryId: e.categoryId ?? e.category_id ?? null,
       }));

       setExpenses(normalized);
       setFilteredExpenses(normalized);
       setCategories(categoryList);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
let result = Array.isArray(expenses) ? [...expenses] : [];

    if (searchTerm) {
      result = result.filter(expense => 
      (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
       (expense.merchant || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      result = result.filter(expense => 
        expense.categoryId === parseInt(categoryFilter)
      );
    }
    
    setFilteredExpenses(result);
  }, [searchTerm, categoryFilter, expenses]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(prev => (Array.isArray(prev) ? prev.filter(e => e.expenseId !== id) : prev));
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Expense List</Typography>
      
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Search expenses"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
 endAdornment: (
     <InputAdornment position="end">
       <Search />
     </InputAdornment>
   ),            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            variant="outlined"
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category.categoryId} value={category.categoryId}>
                {category.categoryName}
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Merchant</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
{(Array.isArray(filteredExpenses) ? filteredExpenses : []).map((expense) => (
                <TableRow key={expense.expenseId}>
                <TableCell>
{expense.transactionDate ? new Date(expense.transactionDate).toLocaleDateString() : '-'}
                </TableCell>
               <TableCell>{expense.merchant || '-'}</TableCell>
       <TableCell>{expense.description || '-'}</TableCell>
       <TableCell>
         {Number.isFinite(expense.amount) ? `£${expense.amount.toFixed(2)}` : '£0.00'}
       </TableCell>
                <TableCell>
                  {categories.find(c => c.categoryId === expense.categoryId)?.categoryName || 'Uncategorized'}
                </TableCell>
                <TableCell>
                  <IconButton color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton 
                    color="error"
                    onClick={() => handleDelete(expense.expenseId)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ExpenseList;