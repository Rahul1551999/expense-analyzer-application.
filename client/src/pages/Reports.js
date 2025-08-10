import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { 
  Card, CardContent, Typography, Grid, Select, MenuItem, Paper, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow 
} from '@mui/material';
import api from '../services/api';

const Reports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [timeRange, setTimeRange] = useState('year');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportRes, categoriesRes] = await Promise.all([
          api.get(`/reports?type=${reportType}&range=${timeRange}`),
          api.get('/categories')
        ]);
        setReportData(reportRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };
    fetchData();
  }, [reportType, timeRange]);

  const renderChart = () => {
    if (!reportData) return null;
    
    switch (reportType) {
      case 'monthly':
        return (
          <Line
            data={{
              labels: reportData.months,
              datasets: [{
                label: 'Monthly Spending',
                data: reportData.amounts,
                borderColor: '#36A2EB',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.1
              }]
            }}
            options={{
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        );
      
      case 'category':
        return (
          <Bar
            data={{
              labels: reportData.categories.map(cat => 
                categories.find(c => c.categoryId === cat.id)?.categoryName || cat.id
              ),
              datasets: [{
                label: 'Spending by Category',
                data: reportData.amounts,
                backgroundColor: '#FF6384'
              }]
            }}
            options={{
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Reports</Typography>
      
      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            variant="outlined"
          >
            <MenuItem value="monthly">Monthly Trend</MenuItem>
            <MenuItem value="category">Category Breakdown</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={6}>
          <Select
            fullWidth
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            variant="outlined"
          >
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last 3 Months</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </Grid>
      </Grid>
      
      <Card style={{ marginBottom: '20px' }}>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
      
      {reportData && reportData.topExpenses && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Top Expenses</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Merchant</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.topExpenses.map((expense, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(expense.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{expense.merchant}</TableCell>
                      <TableCell>${expense.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {categories.find(c => c.categoryId === expense.categoryId)?.categoryName || 'Uncategorized'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;