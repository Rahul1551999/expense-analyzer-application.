import React, { useState, useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Card, CardContent, Typography, Grid, Select, MenuItem, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Button
} from '@mui/material';
import api from '../services/api';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/Adobe Express - file.png'; // ensure this lives in src/assets

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// helpers
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const formatGBP = (v) => `£${toNumber(v).toFixed(2)}`;

const Reports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [reportData, setReportData] = useState(null);
  const [timeRange, setTimeRange] = useState('year');
  const [categories, setCategories] = useState([]);

  // One ref for whichever chart is currently rendered
  const chartRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportRes, categoriesRes] = await Promise.all([
          api.get(`/reports?type=${reportType}&range=${timeRange}`),
          api.get('/categories')
        ]);

        const d = reportRes.data || {};
        const normalized = {
          months: Array.isArray(d.months) ? d.months : [],
          amounts: Array.isArray(d.amounts) ? d.amounts.map(toNumber) : [],
          categories: Array.isArray(d.categories) ? d.categories : [],
         topExpenses: Array.isArray(d.topExpenses)
   ? d.topExpenses.map((e) => ({
       ...e,
       amount: toNumber(e.amount),
       // pick up whichever the API gave us and normalize
       categoryId: e.categoryId ?? e.category_id ?? null
     }))
   : [],
        };
        setReportData(normalized);

        const catList = Array.isArray(categoriesRes.data)
          ? categoriesRes.data
          : categoriesRes.data?.categories || categoriesRes.data?.data || [];
        setCategories(
          catList.map((c) => ({
            categoryId: c.categoryId ?? c.id ?? c.category_id,
            categoryName: c.categoryName ?? c.name ?? c.category_name ?? 'Unnamed',
          }))
        );
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };
    fetchData();
  }, [reportType, timeRange]);

  const exportPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF(); // A4 portrait, mm

    // Header: small logo + bold title
    try {
      doc.addImage(logo, 'PNG', 12, 10, 16, 16); // x, y, w, h
    } catch {
      // ignore if logo load fails
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Expense Report', 32, 20);

    // Separator line
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 12;
    const headerBottomY = 28;
    doc.setDrawColor(180);
    doc.setLineWidth(0.4);
    doc.line(marginX, headerBottomY, pageWidth - marginX, headerBottomY);

    // Chart image (keep aspect ratio)
    let nextY = headerBottomY + 6;
    const chartInstance = chartRef.current;
    const canvas = chartInstance?.canvas; // react-chartjs-2 v5 forwards chart instance; Chart.js exposes .canvas
    if (canvas) {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const availableWidth = pageWidth - marginX * 2;
      const ratio = canvas.height / canvas.width || 0.5;
      const imgW = availableWidth;       // fill printable width
      const imgH = imgW * ratio;         // keep aspect
      doc.addImage(imgData, 'PNG', marginX, nextY, imgW, imgH);
      nextY += imgH + 8;
    }

    // Table: Top Expenses
    if (reportData.topExpenses?.length) {
      autoTable(doc, {
        startY: nextY,
        head: [['Date', 'Merchant', 'Amount', 'Category']],
        body: reportData.topExpenses.map((expense) => [
          expense.date ? new Date(expense.date).toLocaleDateString() : '-',
          expense.merchant || '-',
          formatGBP(expense.amount),
          categories.find((c) => c.categoryId === expense.categoryId)?.categoryName || 'Uncategorized',
        ]),
        styles: { font: 'helvetica', fontSize: 10 },
        headStyles: { fillColor: [33, 150, 243] },
        margin: { left: marginX, right: marginX },
      });
    }

    doc.save(`report_${reportType}_${timeRange}.pdf`);
  };

  const renderChart = () => {
    if (!reportData) return null;

    if (reportType === 'monthly') {
      return (
        <Line
          ref={chartRef}
          data={{
            labels: reportData.months,
            datasets: [{
              label: 'Monthly Spending',
              data: reportData.amounts.map(toNumber),
              borderColor: '#36A2EB',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              tension: 0.3
            }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
          }}
        />
      );
    }

    // category
    return (
      <Bar
        ref={chartRef}
        data={{
          labels: (reportData.categories || []).map((cat) =>
            categories.find((c) => c.categoryId === cat.id)?.categoryName || String(cat.id)
          ),
          datasets: [{
            label: 'Spending by Category',
            data: (reportData.amounts || []).map(toNumber),
            backgroundColor: '#FF6384'
          }]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }}
      />
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Reports</Typography>

      <Grid container spacing={2} style={{ marginBottom: '20px' }}>
        <Grid item xs={12} md={6}>
          <Select fullWidth value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <MenuItem value="monthly">Monthly Trend</MenuItem>
            <MenuItem value="category">Category Breakdown</MenuItem>
          </Select>
        </Grid>
        <Grid item xs={12} md={6}>
          <Select fullWidth value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last 3 Months</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </Grid>
      </Grid>

      <Card style={{ marginBottom: '20px', height: '400px' }}>
        <CardContent>{renderChart()}</CardContent>
      </Card>

      {reportData?.topExpenses?.length ? (
        <Card style={{ marginBottom: '20px' }}>
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
                        {expense.date ? new Date(expense.date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>{expense.merchant || '-'}</TableCell>
                      <TableCell>{formatGBP(expense.amount)}</TableCell>
                      <TableCell>
                        {categories.find((c) => Number(c.categoryId) === Number(expense.categoryId))?.categoryName || 'Uncategorized'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : null}

      <Button variant="contained" color="primary" onClick={exportPDF}>
        Export PDF
      </Button>
    </div>
  );
};

export default Reports;
