import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import './DeveloperDashboard.css'
Chart.register(...registerables);

const DeveloperDashboard = () => {
    const navigate = useNavigate();
    const [systemHealth, setSystemHealth] = useState(null);
    const [errorLogs, setErrorLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [queries, setQueries] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showCreateTable, setShowCreateTable] = useState(false);
    const [loading, setLoading] = useState({
        health: true,
        logs: true,
        users: true,
        queries: true
    });
    const [error, setError] = useState({
        health: null,
        logs: null,
        users: null,
        queries: null
    });

    const fetchSystemHealth = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/developer/system-health', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch system health');
            }

            const data = await response.json();
            setSystemHealth(data);
            setError(prev => ({ ...prev, health: null }));
            setShowCreateTable(!data.system_logs_exists);
        } catch (err) {
            console.error('System health fetch error:', err);
            setError(prev => ({ ...prev, health: err.message }));
            
            if (err.response?.data?.fallbackData) {
                setSystemHealth(err.response.data.fallbackData);
            }
        } finally {
            setLoading(prev => ({ ...prev, health: false }));
        }
    };

    const fetchErrorLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/developer/error-logs', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch error logs');
            }

            const data = await response.json();
            setErrorLogs(data);
            setError(prev => ({ ...prev, logs: null }));
        } catch (err) {
            console.error('Error logs fetch error:', err);
            setError(prev => ({ ...prev, logs: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, logs: false }));
        }
    };

    const createLogsTable = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/developer/create-logs-table', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to create table');
            }

            const result = await response.json();
            alert(result.message);
            setShowCreateTable(false);
            fetchSystemHealth();
            fetchErrorLogs();
        } catch (err) {
            console.error('Create table error:', err);
            alert('Failed to create table: ' + err.message);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/developer/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setUsers(data);
            setError(prev => ({ ...prev, users: null }));
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError(prev => ({ ...prev, users: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    };

    const fetchQueries = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/developer/queries', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            // Transform the queries data to ensure proper field names
            const transformedQueries = data.map(query => ({
                ...query,
                id: query._id,
                customer_name: query.customerName || 'Unknown',
                customer_email: query.customerEmail || 'No email',
                created_at: query.createdAt,
                auto_reply: query.autoReply,
                status: query.status || 'pending'
            }));
            
            setQueries(transformedQueries);
            setError(prev => ({ ...prev, queries: null }));
        } catch (err) {
            console.error('Failed to fetch queries:', err);
            setError(prev => ({ ...prev, queries: err.message }));
        } finally {
            setLoading(prev => ({ ...prev, queries: false }));
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setShowUserModal(true);
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/developer/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                fetchUsers();
                alert('User deleted successfully');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete user');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete user');
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/developer/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                fetchUsers();
                setShowUserModal(false);
                alert('User updated successfully');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update user');
            }
        } catch (err) {
            console.error('Update error:', err);
            alert('Failed to update user');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '0s';
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return [
            days > 0 ? `${days}d` : '',
            hours > 0 ? `${hours}h` : '',
            mins > 0 ? `${mins}m` : '',
            `${secs}s`
        ].filter(Boolean).join(' ');
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
            case 'complete':
                return <span className="status-badge completed">Completed</span>;
            default:
                return <span className="status-badge unknown">{status}</span>;
        }
    };

    useEffect(() => {
        fetchSystemHealth();
        fetchErrorLogs();
        fetchUsers();
        fetchQueries();

        const interval = setInterval(() => {
            fetchSystemHealth();
            fetchErrorLogs();
            fetchUsers();
            fetchQueries();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Memory Usage Chart
    const memoryChartData = {
        labels: ['Used', 'Free'],
        datasets: [{
            label: 'Memory (MB)',
            data: [
                systemHealth?.server.memory.used || 0,
                (systemHealth?.server.memory.total || 0) - (systemHealth?.server.memory.used || 0)
            ],
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)'
            ],
            borderWidth: 1
        }]
    };

    // Error Logs Chart
    const errorLogsChartData = {
        labels: errorLogs.map(log => new Date(log.timestamp).toLocaleTimeString()),
        datasets: [{
            label: 'Error Severity',
            data: errorLogs.map(log => {
                switch(log.level) {
                    case 'ERROR': return 3;
                    case 'WARN': return 2;
                    default: return 1;
                }
            }),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            tension: 0.1
        }]
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h2>Developer Dashboard</h2>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>

            {showCreateTable && (
                <div className="dashboard-section warning">
                    <h3>System Logs Table Missing</h3>
                    <p>The system_logs table does not exist in the database.</p>
                    <button onClick={createLogsTable} className="create-table-button">
                        Create System Logs Table
                    </button>
                </div>
            )}

            {/* System Health Section */}
            <div className="dashboard-section">
                <h3>System Health</h3>
                {loading.health ? (
                    <div className="loading">Loading system health data...</div>
                ) : error.health ? (
                    <div className="error-message">
                        <p>Error: {error.health}</p>
                        {systemHealth && <p>Showing fallback data</p>}
                    </div>
                ) : (
                    <div className="health-content">
                        <div className="health-stats">
                            <h4>Database</h4>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>Connections:</td>
                                        <td>{systemHealth?.database.connections}</td>
                                    </tr>
                                    <tr>
                                        <td>Uptime:</td>
                                        <td>{systemHealth?.database.uptime}</td>
                                    </tr>
                                    <tr>
                                        <td>Users:</td>
                                        <td>{systemHealth?.database.users}</td>
                                    </tr>
                                    <tr>
                                        <td>Products:</td>
                                        <td>{systemHealth?.database.products}</td>
                                    </tr>
                                    <tr>
                                        <td>Sales:</td>
                                        <td>{systemHealth?.database.sales}</td>
                                    </tr>
                                    <tr>
                                        <td>Queries:</td>
                                        <td>{systemHealth?.database.queries}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h4>Server</h4>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>Status:</td>
                                        <td>
                                            <span className={`status-${systemHealth?.server.status}`}>
                                                {systemHealth?.server.status}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Uptime:</td>
                                        <td>{formatUptime(systemHealth?.server.uptime)}</td>
                                    </tr>
                                    <tr>
                                        <td>Environment:</td>
                                        <td>{systemHealth?.server.environment}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="health-chart">
                            <Bar 
                                data={memoryChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'top'
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${context.raw} MB`
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Error Logs Section */}
            <div className="dashboard-section">
                <h3>Error Logs</h3>
                {loading.logs ? (
                    <div className="loading">Loading error logs...</div>
                ) : error.logs ? (
                    <div className="error-message">
                        <p>Error: {error.logs}</p>
                        {errorLogs.length > 0 && <p>Showing partial data</p>}
                    </div>
                ) : (
                    <div className="logs-content">
                        <div className="logs-chart">
                            <Line
                                data={errorLogsChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: {
                                            ticks: {
                                                callback: (value) => {
                                                    switch(value) {
                                                        case 1: return 'INFO';
                                                        case 2: return 'WARN';
                                                        case 3: return 'ERROR';
                                                        default: return value;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="logs-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Level</th>
                                        <th>Service</th>
                                        <th>Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {errorLogs.map(log => (
                                        <tr key={log.id} className={`log-${log.level.toLowerCase()}`}>
                                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                                            <td>{log.level}</td>
                                            <td>{log.service}</td>
                                            <td>{log.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* User Management Section */}
            <div className="dashboard-section">
                <h3>User Management</h3>
                {loading.users ? (
                    <div className="loading">Loading users...</div>
                ) : error.users ? (
                    <div className="error-message">
                        <p>Error: {error.users}</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{formatDate(user.createdAt)}</td>
                                        <td>
                                            <button onClick={() => handleEditUser(user)}>Edit</button>
                                            <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Query Management Section */}
            <div className="dashboard-section">
                <h3>Recent Queries</h3>
                {loading.queries ? (
                    <div className="loading">Loading queries...</div>
                ) : error.queries ? (
                    <div className="error-message">
                        <p>Error: {error.queries}</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="queries-table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Email</th>
                                    <th>Message</th>
                                    <th>Response</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queries.map(query => (
                                    <tr key={query.id}>
                                        <td>{query.customer_name}</td>
                                        <td>
                                            <a href={`mailto:${query.customer_email}`}>
                                                {query.customer_email}
                                            </a>
                                        </td>
                                        <td className="message-cell">{query.message}</td>
                                        <td className="response-cell">
                                            {query.auto_reply || "No response yet"}
                                        </td>
                                        <td>
                                            {getStatusBadge(query.status)}
                                        </td>
                                        <td>{formatDate(query.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Edit Modal */}
            {showUserModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Edit User</h3>
                        <form onSubmit={handleSaveUser}>
                            <div className="form-group">
                                <label>Name:</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    defaultValue={editingUser?.name} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Email:</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    defaultValue={editingUser?.email} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Role:</label>
                                <select 
                                    name="role" 
                                    defaultValue={editingUser?.role}
                                    required
                                >
                                    <option value="sales">Sales</option>
                                    <option value="finance">Finance</option>
                                    <option value="developer">Developer</option>
                                    <option value="investor">Investor</option>
                                    <option value="client">Client</option>
                                    <option value="primary_partner">Primary Partner</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowUserModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style jsx>{`
                .dashboard-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                    font-family: Arial, sans-serif;
                }
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }
                .logout-button {
                    background-color: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s;
                }
                .logout-button:hover {
                    background-color: #c82333;
                }
                .dashboard-section {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    padding: 20px;
                    margin-bottom: 20px;
                }
                .dashboard-section.warning {
                    background-color: #fff3cd;
                    border-left: 5px solid #ffc107;
                }
                h2, h3, h4 {
                    color: #333;
                    margin-top: 0;
                }
                h4 {
                    margin-bottom: 10px;
                    color: #555;
                }
                .loading {
                    display: flex;
                    justify-content: center;
                    padding: 20px;
                    color: #666;
                    font-style: italic;
                }
                .error-message {
                    color: #dc3545;
                    padding: 10px;
                    background: #f8d7da;
                    border-radius: 4px;
                    margin-bottom: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background-color: #f5f5f5;
                    font-weight: bold;
                }
                .health-content {
                    display: flex;
                    gap: 20px;
                }
                .health-stats {
                    flex: 1;
                    min-width: 300px;
                }
                .health-chart {
                    flex: 1;
                    min-width: 300px;
                    height: 300px;
                }
                .logs-content {
                    display: flex;
                    gap: 20px;
                }
                .logs-chart {
                    flex: 1;
                    min-width: 300px;
                    height: 300px;
                }
                .logs-table {
                    flex: 1;
                    min-width: 300px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .status-online {
                    color: #28a745;
                    font-weight: bold;
                }
                .status-error {
                    color: #dc3545;
                    font-weight: bold;
                }
                .log-error {
                    background-color: #f8d7da;
                }
                .log-warn {
                    background-color: #fff3cd;
                }
                .log-info {
                    background-color: #d1ecf1;
                }
                .table-container {
                    overflow-x: auto;
                }
                .message-cell {
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .status-pending {
                    color: #ffc107;
                }
                .status-resolved {
                    color: #28a745;
                }
                .status-rejected {
                    color: #dc3545;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 100%;
                    max-width: 500px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                .form-group input,
                .form-group select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                .modal-actions button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .modal-actions button[type="button"] {
                    background-color: #6c757d;
                    color: white;
                }
                .modal-actions button[type="submit"] {
                    background-color: #007bff;
                    color: white;
                }
                .create-table-button {
                    background-color: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s;
                }
                .create-table-button:hover {
                    background-color: #218838;
                }
                @media (max-width: 768px) {
                    .health-content, .logs-content {
                        flex-direction: column;
                    }
                }
                    .warning {
    background-color: #fff3cd;
    border-left: 5px solid #ffc107;
}

.create-table-button {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
}

.create-table-button:hover {
    background-color: #218838;
}
            `}</style>
        </div>
    );
};

export default DeveloperDashboard;