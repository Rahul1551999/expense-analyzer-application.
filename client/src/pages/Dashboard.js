import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  Box
} from '@mui/material';
import api from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSpent: 0,
    categoryBreakdown: [],
    monthlyTrend: []
  });
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`/expenses/dashboard?range=${timeRange}`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    fetchData();
  }, [timeRange]);

  const categoryData = {
    labels: stats.categoryBreakdown.map(item => item.category),
    datasets: [{
      label: 'Spending by Category',
      data: stats.categoryBreakdown.map(item => item.total),
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#8AC24A', '#607D8B', '#E91E63', '#9C27B0'
      ]
    }]
  };

  const monthlyData = {
    labels: stats.monthlyTrend.map(item => item.month),
    datasets: [{
      label: 'Monthly Spending',
      data: stats.monthlyTrend.map(item => item.total),
      backgroundColor: '#36A2EB',
      borderColor: '#36A2EB',
      borderWidth: 1
    }]
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          variant="outlined"
          size="small"
        >
          <MenuItem value="week">This Week</MenuItem>
          <MenuItem value="month">This Month</MenuItem>
          <MenuItem value="year">This Year</MenuItem>
        </Select>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Total Spent</Typography>
              <Typography variant="h3" color="primary">
                ${stats.totalSpent.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>Monthly Trend</Typography>
              <Box sx={{ height: '300px' }}>
                <Bar 
                  data={monthlyData} 
                  options={{ 
                    maintainAspectRatio: false,
                    responsive: true 
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Category Breakdown</Typography>
              <Box sx={{ height: '400px', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: '60%' }}>
                  <Pie 
                    data={categoryData} 
                    options={{ 
                      maintainAspectRatio: false,
                      responsive: true 
                    }} 
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;