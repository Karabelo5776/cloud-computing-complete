import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PrimaryPartnerDashboard.css';

Chart.register(...registerables);

const PrimaryPartnerDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    financial: {
      monthly: { 
        revenue: 0, 
        expenses: 0, 
        profit: 0,
        expenseBreakdown: {
          productPurchases: 0,
          otherExpenses: 0
        }
      },
      yearly: { 
        revenue: 0, 
        expenses: 0, 
        profit: 0,
        expenseBreakdown: {
          productPurchases: 0,
          otherExpenses: 0
        }
      }
    },
    recentSales: [],
    inventory: [],
    loading: true,
    error: null
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'No authentication token found'
      }));
      return;
    }

    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Fetch all data in parallel
      const [financialRes, salesRes, inventoryRes] = await Promise.all([
        axios.get('http://localhost:5000/primary-partner/financial-summary', config),
        axios.get('http://localhost:5000/sales?limit=5&sort=-saleDate', config),
        axios.get('http://localhost:5000/products', config)
      ]);

      // Safely process financial data with default values
      const financialData = {
        monthly: {
          revenue: financialRes.data?.monthly?.revenue || 0,
          expenses: financialRes.data?.monthly?.expenses || 0,
          profit: financialRes.data?.monthly?.profit || 0,
          expenseBreakdown: financialRes.data?.monthly?.expenseBreakdown || {
            productPurchases: 0,
            otherExpenses: 0
          }
        },
        yearly: {
          revenue: financialRes.data?.yearly?.revenue || 0,
          expenses: financialRes.data?.yearly?.expenses || 0,
          profit: financialRes.data?.yearly?.profit || 0,
          expenseBreakdown: financialRes.data?.yearly?.expenseBreakdown || {
            productPurchases: 0,
            otherExpenses: 0
          }
        }
      };

      // Process sales data with proper fallbacks
      const salesData = salesRes.data?.map(sale => ({
        id: sale._id || Math.random().toString(36).substring(7),
        product_name: sale.productId?.name || 'Unknown Product',
        customer_name: sale.customerName || 'Anonymous',
        total_price: sale.totalPrice || 0,
        sale_date: sale.saleDate ? new Date(sale.saleDate) : new Date()
      })) || [];

      // Process inventory data with total cost calculation
      const inventoryData = inventoryRes.data?.map(item => {
        const totalCost = (item.costPrice || 0) * (item.quantity || 0) + (item.expenses || 0);
        return {
          id: item._id || Math.random().toString(36).substring(7),
          name: item.name || 'Unknown Product',
          price: item.price || 0,
          quantity: item.quantity || 0,
          cost_price: item.costPrice || 0,
          expenses: item.expenses || 0,
          total_cost: totalCost
        };
      }) || [];

      setDashboardData({
        financial: financialData,
        recentSales: salesData,
        inventory: inventoryData,
        loading: false,
        error: null
      });

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to load dashboard data'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (value) => {
    return `$${(Number(value) || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  // Chart data configurations
  const financialChartData = {
    labels: ['Revenue', 'Expenses', 'Profit'],
    datasets: [{
      label: 'Current Month',
      data: [
        dashboardData.financial.monthly.revenue,
        dashboardData.financial.monthly.expenses,
        dashboardData.financial.monthly.profit
      ],
      backgroundColor: [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(75, 192, 192, 0.6)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)'
      ],
      borderWidth: 1
    }]
  };

  const expenseBreakdownData = {
    labels: ['Product Purchases', 'Other Expenses'],
    datasets: [{
      data: [
        dashboardData.financial.monthly.expenseBreakdown.productPurchases,
        dashboardData.financial.monthly.expenseBreakdown.otherExpenses
      ],
      backgroundColor: [
        'rgba(255, 159, 64, 0.6)',
        'rgba(153, 102, 255, 0.6)'
      ],
      borderColor: [
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)'
      ],
      borderWidth: 1
    }]
  };

  const salesChartData = {
    labels: dashboardData.recentSales.map(sale => 
      sale.product_name.substring(0, 15) || `Sale #${sale.id.slice(-4)}`),
    datasets: [{
      label: 'Sales Amount ($)',
      data: dashboardData.recentSales.map(sale => sale.total_price),
      backgroundColor: 'rgba(153, 102, 255, 0.6)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 1
    }]
  };

  const inventoryChartData = {
    labels: dashboardData.inventory.map(item => item.name.substring(0, 15)),
    datasets: [{
      label: 'Stock Quantity',
      data: dashboardData.inventory.map(item => item.quantity),
      backgroundColor: dashboardData.inventory.map(item => 
        item.quantity > 10 ? 'rgba(75, 192, 192, 0.6)' : 
        item.quantity > 0 ? 'rgba(255, 205, 86, 0.6)' : 'rgba(255, 99, 132, 0.6)'),
      borderColor: dashboardData.inventory.map(item => 
        item.quantity > 10 ? 'rgba(75, 192, 192, 1)' : 
        item.quantity > 0 ? 'rgba(255, 205, 86, 1)' : 'rgba(255, 99, 132, 1)'),
      borderWidth: 1
    }]
  };

  if (dashboardData.loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="error-container">
        <div className="error-message">{dashboardData.error}</div>
        <button onClick={fetchDashboardData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Primary Partner Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {/* Financial Overview Section */}
      <div className="dashboard-section">
        <h2>Financial Overview</h2>
        <div className="financial-content">
          <div className="financial-tables">
            <div className="financial-table">
              <h3>Current Month</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Revenue:</td>
                    <td>{formatCurrency(dashboardData.financial.monthly.revenue)}</td>
                  </tr>
                  <tr>
                    <td>Expenses:</td>
                    <td>{formatCurrency(dashboardData.financial.monthly.expenses)}</td>
                  </tr>
                  <tr className="expense-detail">
                    <td>↳ Product Purchases:</td>
                    <td>{formatCurrency(dashboardData.financial.monthly.expenseBreakdown.productPurchases)}</td>
                  </tr>
                  <tr className="expense-detail">
                    <td>↳ Other Expenses:</td>
                    <td>{formatCurrency(dashboardData.financial.monthly.expenseBreakdown.otherExpenses)}</td>
                  </tr>
                  <tr>
                    <td>Profit:</td>
                    <td className={
                      dashboardData.financial.monthly.profit >= 0 ? 'positive' : 'negative'
                    }>
                      {formatCurrency(dashboardData.financial.monthly.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="financial-table">
              <h3>Year to Date</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Revenue:</td>
                    <td>{formatCurrency(dashboardData.financial.yearly.revenue)}</td>
                  </tr>
                  <tr>
                    <td>Expenses:</td>
                    <td>{formatCurrency(dashboardData.financial.yearly.expenses)}</td>
                  </tr>
                  <tr className="expense-detail">
                    <td>↳ Product Purchases:</td>
                    <td>{formatCurrency(dashboardData.financial.yearly.expenseBreakdown.productPurchases)}</td>
                  </tr>
                  <tr className="expense-detail">
                    <td>↳ Other Expenses:</td>
                    <td>{formatCurrency(dashboardData.financial.yearly.expenseBreakdown.otherExpenses)}</td>
                  </tr>
                  <tr>
                    <td>Profit:</td>
                    <td className={
                      dashboardData.financial.yearly.profit >= 0 ? 'positive' : 'negative'
                    }>
                      {formatCurrency(dashboardData.financial.yearly.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="financial-charts">
            <div className="financial-chart">
              <Pie 
                data={financialChartData} 
                options={{
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          return `${label}: ${formatCurrency(value)}`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="expense-chart">
              <Pie 
                data={expenseBreakdownData} 
                options={{
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = Math.round((value / total) * 100);
                          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="dashboard-section">
        <h2>Recent Sales</h2>
        {dashboardData.recentSales.length > 0 ? (
          <div className="sales-content">
            <div className="sales-chart">
              <Bar 
                data={salesChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${formatCurrency(context.raw)}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatCurrency(value)
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="sales-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentSales.map(sale => (
                    <tr key={sale.id}>
                      <td>{sale.product_name}</td>
                      <td>{sale.customer_name}</td>
                      <td>{formatCurrency(sale.total_price)}</td>
                      <td>{formatDate(sale.sale_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="no-data">No recent sales data available</div>
        )}
      </div>

      {/* Inventory Status Section */}
      <div className="dashboard-section">
        <h2>Inventory Status</h2>
        {dashboardData.inventory.length > 0 ? (
          <div className="inventory-content">
            <div className="inventory-chart">
              <Bar 
                data={inventoryChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
            <div className="inventory-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>In Stock</th>
                    <th>Cost Price</th>
                    <th>Expenses</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.inventory.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td className={
                        item.quantity > 10 ? 'high-stock' :
                        item.quantity > 0 ? 'low-stock' : 'out-of-stock'
                      }>
                        {item.quantity}
                      </td>
                      <td>{formatCurrency(item.cost_price)}</td>
                      <td>{formatCurrency(item.expenses)}</td>
                      <td>{formatCurrency(item.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="no-data">No inventory data available</div>
        )}
      </div>
    </div>
  );
};

export default PrimaryPartnerDashboard;