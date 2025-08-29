// src/pages/receipts/ReceiptUpload.js
import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Button, Typography, Paper, CircularProgress, Grid, TextField, Select, MenuItem
} from '@mui/material';
import { CloudUpload, CheckCircle } from '@mui/icons-material';
import api from '../../services/api';

const ReceiptUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [lastReceiptId, setLastReceiptId] = useState(null);

  const [expenseData, setExpenseData] = useState({
    amount: '',
    date: '',               // ← start empty so we never default to "today"
    merchant: '',
    categoryId: ''
  });

  // UI hints
  const [dateNotice, setDateNotice] = useState(''); // small inline notification under date
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      setFiles(
        acceptedFiles.map(file =>
          Object.assign(file, { preview: URL.createObjectURL(file) })
        )
      );
      setUploadComplete(false);
      setDateNotice('');
    }
  });

  const handleChange = (e) => {
    setExpenseData({ ...expenseData, [e.target.name]: e.target.value });
    if (e.target.name === 'date') {
      // Clear the hint as soon as the user provides a date manually
      if (e.target.value) setDateNotice('');
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      // 1) Upload image to /api/receipts
      const fd = new FormData();
      fd.append('receipt', files[0]);

      const up = await api.post('/receipts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,                // generous upload timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const receiptId = up.data?.receipt?.id;
      setLastReceiptId(receiptId);

      // 2) OCR process
      const proc = await api.post(`/receipts/${receiptId}/process`, null, {
        timeout: 180000,               // first OCR can download models; allow time
      });

      const parsed = proc.data?.extractedData || {};

      // 3) Prefill fields; if date missing, show a small inline hint
      setExpenseData(prev => ({
        ...prev,
        amount: parsed.amount || prev.amount,
        date: parsed.date || '',        // keep empty if not found
        merchant: parsed.merchant || prev.merchant
      }));

      if (!parsed.date) {
        setDateNotice('Couldn’t detect a date from the receipt — please add it manually.');
      } else {
        setDateNotice(''); // clear hint when OCR found a date
      }

      setUploadComplete(true);
    } catch (error) {
      console.error('OCR flow error:', error);
    } finally {
      setUploading(false);
    }
  };

  const toISO = (d) => {
    if (!d) return null;
    try { return new Date(d).toISOString().slice(0, 10); } catch { return d; }
  };

  const saveExpense = async () => {
    // Don’t allow saving with no date — prevents DB from ever writing “today”.
    if (!expenseData.date) {
      setDateNotice('Please add a date before saving.');
      return;
    }

    try {
      const res = await api.post('/expenses', {
        amount: Number(expenseData.amount) || null,
        date: toISO(expenseData.date),            // ← send the (OCR/user) date
        merchant: expenseData.merchant || null,
        description: expenseData.merchant || 'receipt',
        categoryId: expenseData.categoryId || null,
        receiptId: lastReceiptId || null
      });

      if (res.data?.autoCategory?.categoryName) {
        // optional: toast/snackbar
        alert(`Auto-categorized as: ${res.data.autoCategory.categoryName}`);
      }

      // reset UI
      setFiles([]);
      setLastReceiptId(null);
      setExpenseData({
        amount: '',
        date: '',
        merchant: '',
        categoryId: ''
      });
      setDateNotice('');
      setUploadComplete(false);
    } catch (e) {
      console.error('Save expense error:', e);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Upload Receipt</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            {...getRootProps()}
            style={{
              padding: '20px',
              textAlign: 'center',
              border: '2px dashed #ccc',
              cursor: 'pointer',
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <input {...getInputProps()} />
            {files.length === 0 ? (
              <>
                <CloudUpload style={{ fontSize: '48px', color: '#1976d2' }} />
                <Typography>Drag and drop a receipt image here, or click to select</Typography>
                <Typography variant="caption">Supports JPG, PNG, etc.</Typography>
              </>
            ) : (
              <>
                <img
                  src={files[0].preview}
                  alt="Receipt preview"
                  style={{ maxHeight: '200px', maxWidth: '100%' }}
                />
                <Typography>{files[0].name}</Typography>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={expenseData.amount}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Date"
            name="date"
            type="date"
            value={expenseData.date}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            error={!expenseData.date && !!dateNotice}
            helperText={dateNotice}
          />

          <TextField
            fullWidth
            label="Merchant"
            name="merchant"
            value={expenseData.merchant}
            onChange={handleChange}
            margin="normal"
          />

          <Select
            fullWidth
            name="categoryId"
            value={expenseData.categoryId}
            onChange={handleChange}
            displayEmpty
            style={{ marginTop: 16 }}
          >
            <MenuItem value="" disabled>Select a category</MenuItem>
            {categories.map(category => (
              <MenuItem key={category.categoryId} value={category.categoryId}>
                {category.categoryName}
              </MenuItem>
            ))}
          </Select>

          <div style={{ marginTop: 20 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={uploading || files.length === 0}
              startIcon={
                uploading ? <CircularProgress size={20} /> :
                uploadComplete ? <CheckCircle /> : <CloudUpload />
              }
            >
              {uploading ? 'Processing…' :
                uploadComplete ? 'Upload Complete' : 'Upload Receipt'}
            </Button>

            <Button
              variant="outlined"
              onClick={saveExpense}
              disabled={!uploadComplete || !expenseData.date}  // ← require a date
              style={{ marginLeft: 8 }}
            >
              Save Expense
            </Button>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

export default ReceiptUpload;
