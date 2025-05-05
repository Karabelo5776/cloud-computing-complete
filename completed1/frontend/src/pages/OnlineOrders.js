import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './OnlineOrders.css';

const OnlineOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    searchQuery: ''
  });
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  // Format price display
  const formatPrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    fetchOrders();
  }, [filters.status, filters.startDate, filters.endDate]); 

  useEffect(() => {
    applySearchFilter();
  }, [orders, filters.searchQuery]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await axios.get(`http://localhost:5000/api/client-purchases?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Transform orders to include all necessary fields
      const transformedOrders = res.data.map(order => ({
        ...order,
        id: order._id, // Use MongoDB _id as order ID
        customer_name: order.customerName || 'N/A',
        customer_email: order.customerEmail || 'N/A',
        product_name: order.productName || 'Unknown Product',
        sale_date: order.saleDate || new Date().toISOString(),
        total_price: order.totalPrice || 0,
        quantity: order.quantity || 1
      }));
      
      setOrders(transformedOrders);
      setFeedback({ message: '', type: '' });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setFeedback({
        message: error.response?.data?.message || 'Failed to load orders',
        type: 'error'
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    if (!filters.searchQuery) {
      setFilteredOrders(orders);
      return;
    }

    const query = filters.searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      (order.customer_name && order.customer_name.toLowerCase().includes(query)) || 
      (order.customer_email && order.customer_email.toLowerCase().includes(query)) ||
      (order.product_name && order.product_name.toLowerCase().includes(query)) ||
      (order._id && order._id.toLowerCase().includes(query))
    );
    
    setFilteredOrders(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'processing':
        return <span className="status-badge processing">Processing</span>;
      case 'completed':
        return <span className="status-badge completed">Completed</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">Cancelled</span>;
      default:
        return <span className="status-badge unknown">{status}</span>;
    }
  };

  // Display orders will be filteredOrders if search is active, otherwise all orders
  const displayOrders = filters.searchQuery ? filteredOrders : orders;

  return (
    <div className="online-orders-container">
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <header className="orders-header">
        <h2>Online Orders Management</h2>
        <div className="header-controls">
          <nav>
            <Link to="/sales" className="nav-link">Sales Dashboard</Link>
            <Link to="/products" className="nav-link">Products</Link>
            <Link to="/queries" className="nav-link">Client Queries</Link>
          </nav>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="filters-section">
        <h3>Filter Orders</h3>
        <div className="filter-controls">
          <input
            type="text"
            name="searchQuery"
            value={filters.searchQuery}
            onChange={handleFilterChange}
            placeholder="Search by name, email, product or order ID"
            className="search-input"
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="status-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="date-filters">
            <div className="date-filter-group">
              <label>From:</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="date-filter-group">
              <label>To:</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <button onClick={fetchOrders} className="refresh-btn">
            <i className="refresh-icon">↻</i> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          Loading orders...
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="no-orders">
          {filters.searchQuery ? 
            'No orders match your search criteria' : 
            'No orders found matching your filters'}
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.map(order => (
                <tr key={order._id} className={`order-row ${order.orderStatus || 'pending'}`}>
                  <td className="order-id">#{order._id.toString().substring(0, 8)}</td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <div className="customer-name">{order.customer_name}</div>
                      <div className="customer-email">
                        <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
                      </div>
                      {order.shippingAddress && (
                        <div className="shipping-address">
                          <small>{order.shippingAddress}</small>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="product-cell">{order.product_name}</td>
                  <td className="quantity-cell">{order.quantity}</td>
                  <td className="total-cell">${formatPrice(order.total_price)}</td>
                  <td className="date-cell">{formatDate(order.sale_date)}</td>
                  <td className="status-cell">
                    {getStatusBadge(order.orderStatus || 'pending')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OnlineOrders;