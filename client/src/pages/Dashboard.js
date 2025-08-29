import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Card, CardContent, Typography, Grid, Select, MenuItem,
  Box, Stack, FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, Button
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, ArcElement, BarElement, Tooltip, Legend);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSpent: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
    avgPerDay: 0,
    receiptsProcessed: 0,
    topCategory: '—',
  });
  const [timeRange, setTimeRange] = useState('month');
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  const load = async () => {
    try {
      let url = `/expenses/dashboard?range=${timeRange}`;
      if (timeRange === 'custom' && customStart && customEnd) {
        const start = customStart.toISOString().slice(0, 10);
        const end = customEnd.toISOString().slice(0, 10);
        url = `/expenses/dashboard?start=${start}&end=${end}`;
      }
      const res = await api.get(url);
      const d = res.data || {};
      setStats({
        totalSpent: Number(d.totalSpent || 0),
        avgPerDay: Number(d.avgPerDay || 0),
        receiptsProcessed: Number(d.receiptsProcessed || 0),
        topCategory: d.topCategory ?? '—',
        categoryBreakdown: Array.isArray(d.categoryBreakdown) ? d.categoryBreakdown : [],
        monthlyTrend: Array.isArray(d.monthlyTrend) ? d.monthlyTrend : [],
      });
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      load();
    } else if (customStart && customEnd) {
      load();
    }
  }, [timeRange, customStart, customEnd]);

  const pieData = {
    labels: stats.categoryBreakdown.map(item => item.category),
    datasets: [{
      label: 'Spending by Category',
      data: stats.categoryBreakdown.map(item => item.total),
      backgroundColor: [
        '#1976d2','#9c27b0','#ef6c00','#43a047','#e91e63',
        '#3949ab','#00acc1','#8d6e63','#f4511e','#7cb342'
      ]
    }]
  };

  const barData = {
    labels: stats.monthlyTrend.map(p => p.month),
    datasets: [{
      label: 'Spending',
      data: stats.monthlyTrend.map(p => p.total),
      backgroundColor: '#1976d2',
      borderColor: '#1976d2',
      borderWidth: 1
    }]
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Filters Row */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h4">Dashboard</Typography>
        <FormControl size="small">
          <InputLabel id="range-label">Range</InputLabel>
          <Select
            labelId="range-label"
            value={timeRange}
            label="Range"
            onChange={(e) => {
              const val = e.target.value;
              setTimeRange(val);
              if (val === 'custom') setCustomRangeOpen(true);
            }}
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { title: 'Total Spent', value: `£${stats.totalSpent.toFixed(2)}`, color: '#2196f3', icon: '👤' },
      { title: 'Avg / Day', value: `£${stats.avgPerDay.toFixed(2)}`, color: '#4caf50', icon: '👥' },
      { title: 'Receipts Processed', value: stats.receiptsProcessed, color: '#ffeb3b', icon: '📄' },
      { title: 'Top Category', value: stats.topCategory || '—', color: '#f44336', icon: '🏷️' }
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderRadius: 2,
              boxShadow: 3,
              width: '200px',
              height:'80px'
            }}>
              <Box>
                <Typography variant="body2" color="textSecondary">{card.title}</Typography>
                <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
              </Box>
              <Box sx={{
                backgroundColor: card.color,
                color: '#fff',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {card.icon}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 420 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>Trend</Typography>
              <Box sx={{ height: 340 }}>
                <Bar data={barData} options={{ maintainAspectRatio: false, responsive: true }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 420 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>Category Breakdown</Typography>
              <Box sx={{ height: 340 }}>
                <Pie data={pieData} options={{ maintainAspectRatio: false, responsive: true }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Custom Range Dialog */}
      <Dialog open={customRangeOpen} onClose={() => setCustomRangeOpen(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DatePicker
                label="Start Date"
                value={customStart}
                onChange={(newValue) => setCustomStart(newValue)}
              />
              <DatePicker
                label="End Date"
                value={customEnd}
                onChange={(newValue) => setCustomEnd(newValue)}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomRangeOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (customStart && customEnd) {
                setCustomRangeOpen(false);
                load(); // fetch with start & end
              }
            }}
            variant="contained"
            disabled={!customStart || !customEnd}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
