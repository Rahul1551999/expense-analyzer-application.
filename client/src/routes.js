import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import ExpenseList from './pages/expenses/ExpenseList';
import ReceiptUpload from './pages/expenses/ReceiptUpload';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';
import Categories from './pages/Categories';
import PrivateRoute from './components/PrivateRoute';
import MainLayout from './components/layouts/MainLayout';
import Settings from './pages/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Private Routes with Layout */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/upload" element={<ReceiptUpload />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />

      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;