import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, Button, IconButton, Typography, Grid, Select, MenuItem,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Edit, Delete, Search } from '@mui/icons-material';
import api from '../../services/api';

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);
const [trainOnSave, setTrainOnSave] = useState(true);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const toGBP = (n) => (Number.isFinite(n) ? `£${Number(n).toFixed(2)}` : '£0.00');
  const toISODate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const categoriesById = useMemo(() => {
    const map = new Map();
    (Array.isArray(categories) ? categories : []).forEach((c) => {
      const id = c.categoryId ?? c.id ?? c.category_id;
      const name = c.categoryName ?? c.name ?? c.category_name ?? 'Unnamed';
      map.set(Number(id), name);
    });
    return map;
  }, [categories]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesRes, categoriesRes] = await Promise.all([
          api.get('/expenses'),
          api.get('/categories'),
        ]);

        const expenseList = Array.isArray(expensesRes.data)
          ? expensesRes.data
          : expensesRes.data?.expenses || expensesRes.data?.data || [];

        const categoryList = Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : categoriesRes.data?.categories || categoriesRes.data?.data || [];

        const normalized = expenseList.map((e) => ({
         expenseId: e.expenseId ?? e.id ?? e.expense_id,
  transactionDate: e.transactionDate ?? e.date ?? e.date_tx ?? e.createdAt,
  merchant: e.merchant ?? e.vendor ?? '',
  description: e.description ?? '',
  amount: Number(e.amount ?? 0),
  categoryId: e.categoryId ?? e.category_id ?? null,
  receiptId: e.receiptId ?? e.receipt_id ?? null, 
        }));

        setExpenses(normalized);
        setFilteredExpenses(normalized);
        setCategories(
          categoryList.map((c) => ({
            categoryId: c.categoryId ?? c.id ?? c.category_id,
            categoryName: c.categoryName ?? c.name ?? c.category_name ?? 'Unnamed',
          }))
        );
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = Array.isArray(expenses) ? [...expenses] : [];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (expense) =>
          (expense.description || '').toLowerCase().includes(q) ||
          (expense.merchant || '').toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      const catId = Number(categoryFilter);
      result = result.filter((expense) => Number(expense.categoryId) === catId);
    }

    setFilteredExpenses(result);
  }, [searchTerm, categoryFilter, expenses]);

  // OPEN EDIT
  // OPEN EDIT
const openEdit = (expense) => {
  setCurrentExpense({
    ...expense,
    originalCategoryId: expense.categoryId ?? null,   
    transactionDate: toISODate(expense.transactionDate),
    merchant: expense.merchant ?? '',
    description: expense.description ?? '',
    amount: Number(expense.amount ?? 0),
    categoryId: expense.categoryId ?? null,
  });
  setEditOpen(true);
};

  const closeEdit = () => {
    setEditOpen(false);
    setCurrentExpense(null);
    setEditSaving(false);
  };
const saveEdit = async () => {
  if (!currentExpense?.expenseId) return;
  try {
    setEditSaving(true);
    const payload = {
      date: currentExpense.transactionDate,
      merchant: currentExpense.merchant,
      description: currentExpense.description,
      amount: Number(currentExpense.amount),
      categoryId: currentExpense.categoryId ? Number(currentExpense.categoryId) : null,
    };

    // 1) Save the edited expense
    await api.put(`/expenses/${encodeURIComponent(String(currentExpense.expenseId))}`, payload);

    // 2) Optimistically update local state
    setExpenses((prev) =>
      (Array.isArray(prev) ? prev : []).map((e) =>
        e.expenseId === currentExpense.expenseId
          ? {
              ...e,
              transactionDate: currentExpense.transactionDate,
              merchant: currentExpense.merchant,
              description: currentExpense.description,
              amount: Number(currentExpense.amount),
              categoryId: currentExpense.categoryId ? Number(currentExpense.categoryId) : null,
            }
          : e
      )
    );

    // 3) If category changed and checkbox ticked, retrain the model
    const changed =
      Number(currentExpense.originalCategoryId ?? 0) !==
      Number(currentExpense.categoryId ?? 0);

    if (trainOnSave && changed && currentExpense.categoryId) {
      try {
        await api.post('/categorization/retrain', {
          expenseId: currentExpense.expenseId,
          correctCategoryId: Number(currentExpense.categoryId),
        });
        // (optional) toast/snackbar success
        // enqueueSnackbar('Model updated with your correction', { variant: 'success' });
      } catch (e) {
        console.error('Retrain failed:', e);
        // (optional) snackbar warning
      }
    }

    closeEdit();
  } catch (error) {
    console.error('Error updating expense:', error);
    alert('Failed to save changes. Please try again.');
    setEditSaving(false);
  }
};


  // OPEN DELETE
  const openDelete = (expense) => {
    setDeleteError('');
    setDeleteExpense(expense);
    setDeleteOpen(true);
  };
  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteSaving(false);
    setDeleteExpense(null);
    setDeleteError('');
  };

  // CONFIRM DELETE
 const confirmDelete = async () => {
  if (!deleteExpense?.expenseId) return;
  try {
    setDeleteSaving(true);
    const idNum = Number(deleteExpense.expenseId);
    const idForUrl = encodeURIComponent(
      String(Number.isNaN(idNum) ? deleteExpense.expenseId : idNum)
    );

    // 1) delete expense
    const res = await api.delete(`/expenses/${idForUrl}`);

    // 2) if expense had a receiptId, delete it too
    if (deleteExpense?.receiptId) {
      try {
        await api.delete(`/receipts/${encodeURIComponent(deleteExpense.receiptId)}`);
      } catch (err) {
        console.warn("Failed to delete linked receipt:", err);
      }
    }

    if ([200, 202, 204].includes(res?.status) || res === undefined) {
      setExpenses((prev) =>
        (Array.isArray(prev) ? prev.filter((e) => e.expenseId !== deleteExpense.expenseId) : prev)
      );
      closeDelete();
      return;
    }

    setDeleteError(`Unexpected response (${res?.status || 'no status'}).`);
    setDeleteSaving(false);
  } catch (error) {
    console.error('Error deleting expense:', error);
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Failed to delete expense.';
    setDeleteError(msg);
    setDeleteSaving(false);
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
              ),
            }}
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
            {(Array.isArray(categories) ? categories : []).map((category) => (
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
              <TableCell width={160}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(Array.isArray(filteredExpenses) ? filteredExpenses : []).map((expense) => {
              const catName = categoriesById.get(Number(expense.categoryId)) || 'Uncategorized';
              return (
                <TableRow key={expense.expenseId}>
                  <TableCell>
                    {expense.transactionDate
                      ? new Date(expense.transactionDate).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>{expense.merchant || '-'}</TableCell>
                  <TableCell>{expense.description || '-'}</TableCell>
                  <TableCell>{toGBP(expense.amount)}</TableCell>
<TableCell>
  {catName}
  <Button size="small" onClick={() => openEdit(expense)} sx={{ ml: 1 }}>
    Fix
  </Button>
</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      aria-label="Edit expense"
                      onClick={() => openEdit(expense)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      aria-label="Delete expense"
                      onClick={() => openDelete(expense)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={currentExpense?.transactionDate || ''}
                onChange={(e) =>
                  setCurrentExpense((prev) => ({ ...prev, transactionDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                inputProps={{ step: '0.01' }}
                value={currentExpense?.amount ?? 0}
                onChange={(e) =>
                  setCurrentExpense((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Merchant"
                value={currentExpense?.merchant || ''}
                onChange={(e) =>
                  setCurrentExpense((prev) => ({ ...prev, merchant: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={
                  currentExpense?.categoryId !== null && currentExpense?.categoryId !== undefined
                    ? Number(currentExpense.categoryId)
                    : ''
                }
                displayEmpty
                onChange={(e) =>
                  setCurrentExpense((prev) => ({
                    ...prev,
                    categoryId: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
              >
                <MenuItem value="">
                  <em>Uncategorized</em>
                </MenuItem>
                {(Array.isArray(categories) ? categories : []).map((c) => (
                  <MenuItem key={c.categoryId} value={Number(c.categoryId)}>
                    {c.categoryName}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Description"
                value={currentExpense?.description || ''}
                onChange={(e) =>
                  setCurrentExpense((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Grid>
             <Grid item xs={12}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={trainOnSave}
            onChange={(e) => setTrainOnSave(e.target.checked)}
          />
          Improve future predictions
        </label>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
          When enabled, your selected category will be used to retrain the model so similar expenses are
          auto-categorized next time.
        </Typography>
      </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={editSaving}>Cancel</Button>
          <Button onClick={saveEdit} variant="contained" disabled={editSaving}>
            {editSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={deleteSaving ? undefined : closeDelete} fullWidth maxWidth="xs">
        <DialogTitle>Delete Expense</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1 }}>
            Are you sure you want to delete this expense?
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {deleteExpense
              ? `${new Date(deleteExpense.transactionDate).toLocaleDateString()} • ${deleteExpense.merchant || '—'} • ${toGBP(deleteExpense.amount)}`
              : ''}
          </Typography>
          {deleteError && (
            <Typography color="error" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleteSaving}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteSaving}
          >
            {deleteSaving ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ExpenseList;
