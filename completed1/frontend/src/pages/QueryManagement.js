import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";
import './QueryManagement.css';

const QueryManagement = () => {
    const [queries, setQueries] = useState([]);
    const [filteredQueries, setFilteredQueries] = useState([]);
    const [responses, setResponses] = useState({});
    const [stats, setStats] = useState({
        totalQueries: 0,
        pendingQueries: 0,
        autoReplied: 0,
        manualReplied: 0
    });
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const chartRef = useRef(null);
    let chartInstance = useRef(null);

    useEffect(() => {
        fetchData();
        return () => {
            // Clean up chart instance when component unmounts
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        filterQueries();
    }, [queries, filter, searchTerm]);

    useEffect(() => {
        if (queries.length > 0 && chartRef.current) {
            renderChart();
        }
    }, [queries]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [queriesRes, statsRes] = await Promise.all([
                axios.get("http://localhost:5000/queries", { headers }),
                axios.get("http://localhost:5000/api/query-stats", { headers })
            ]);
            
            const transformedQueries = queriesRes.data.map(query => ({
                ...query,
                id: query._id,
                customer_name: query.customerName,
                customer_email: query.customerEmail,
                created_at: query.createdAt,
                auto_reply: query.autoReply,
                status: query.status,
                response_type: query.responseType
            }));
            
            setQueries(transformedQueries);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.message || "Failed to load data. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderChart = () => {
        // Destroy previous chart instance if it exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        
        // Prepare data for the chart
        const pendingCount = queries.filter(q => q.status === 'pending').length;
        const autoRepliedCount = queries.filter(q => q.status === 'complete' && q.response_type === 'auto').length;
        const manualRepliedCount = queries.filter(q => q.status === 'complete' && q.response_type === 'manual').length;

        chartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Auto-Replied', 'Manual Replies'],
                datasets: [{
                    data: [pendingCount, autoRepliedCount, manualRepliedCount],
                    backgroundColor: [
                        '#FF6384', // Red for pending
                        '#36A2EB', // Blue for auto-replied
                        '#FFCE56'  // Yellow for manual replies
                    ],
                    hoverBackgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    title: {
                        display: true,
                        text: 'Query Response Status',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    };

    const filterQueries = () => {
        let result = [...queries];
        
        if (filter === "pending") {
            result = result.filter(query => query.status === "pending");
        } else if (filter === "completed") {
            result = result.filter(query => query.status === "complete");
        } else if (filter === "auto-replied") {
            result = result.filter(query => query.status === "complete" && query.response_type === "auto");
        } else if (filter === "manual-replied") {
            result = result.filter(query => query.status === "complete" && query.response_type === "manual");
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(query => 
                (query.customer_name && query.customer_name.toLowerCase().includes(term)) || 
                (query.customer_email && query.customer_email.toLowerCase().includes(term)) ||
                (query.message && query.message.toLowerCase().includes(term))
            );
        }
        
        setFilteredQueries(result);
    };

    const handleResponseChange = (queryId, value) => {
        setResponses(prev => ({ ...prev, [queryId]: value }));
    };

    const handleRespond = async (queryId) => {
        if (!responses[queryId]?.trim()) {
            alert("Please enter a response before sending!");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                "http://localhost:5000/queries/respond", 
                {
                    queryId,
                    response: responses[queryId]
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setResponses(prev => {
                const newResponses = {...prev};
                delete newResponses[queryId];
                return newResponses;
            });
            
            await fetchData();
            
            setError({ message: "Response sent successfully!", type: "success" });
            setTimeout(() => setError(null), 3000);
        } catch (error) {
            console.error("Error sending response:", error);
            setError({
                message: error.response?.data?.message || "Failed to send response. Please try again.",
                type: "error"
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    const getStatusBadge = (query) => {
        if (query.status === "pending") {
            return <span className="status-badge pending">Pending</span>;
        } else if (query.status === "complete") {
            if (query.response_type === "auto") {
                return <span className="status-badge auto-replied">Auto-Replied</span>;
            } else {
                return <span className="status-badge manual-replied">Manually Replied</span>;
            }
        }
        return <span className="status-badge unknown">Unknown</span>;
    };

    if (isLoading) {
        return (
            <div className="query-loading-container">
                <div className="query-loading-indicator">Loading queries...</div>
            </div>
        );
    }

    return (
        <div className="query-management-container">
            <button 
                className="query-back-button"
                onClick={() => navigate(-1)}
            >
                <span>←</span> Back to Dashboard
            </button>
            
            <h2 className="query-main-title">Client Query Management</h2>

            {error && (
                <div className={`query-alert ${error.type || 'error'}`}>
                    {error.message}
                </div>
            )}

            <div className="query-filters-container">
                <div className="query-status-filter">
                    <label htmlFor="query-status-select">Status:</label>
                    <select
                        id="query-status-select"
                        className="query-status-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Queries</option>
                        <option value="pending">Pending Only</option>
                        <option value="completed">Completed Only</option>
                        <option value="auto-replied">Auto-Replied</option>
                        <option value="manual-replied">Manual Replies</option>
                    </select>
                </div>
                
                <div className="query-search-filter">
                    <label htmlFor="query-search-input">Search:</label>
                    <input
                        id="query-search-input"
                        type="text"
                        className="query-search-input"
                        placeholder="Search by name, email or message"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        className="query-refresh-button"
                        onClick={fetchData}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="query-stats-section">
                <h3 className="query-stats-header">Query Statistics</h3>
                <div className="query-stats-grid">
                    <div className="query-stats-card total">
                        <h4>Total Queries</h4>
                        <p>{stats.totalQueries || queries.length}</p>
                    </div>
                    <div className="query-stats-card pending">
                        <h4>Pending</h4>
                        <p>{stats.pendingQueries || queries.filter(q => q.status === 'pending').length}</p>
                    </div>
                    <div className="query-stats-card auto-replied">
                        <h4>Auto-Replied</h4>
                        <p>{stats.autoReplied || queries.filter(q => q.status === 'complete' && q.response_type === 'auto').length}</p>
                    </div>
                    <div className="query-stats-card manual-replied">
                        <h4>Manual Replies</h4>
                        <p>{stats.manualReplied || queries.filter(q => q.status === 'complete' && q.response_type === 'manual').length}</p>
                    </div>
                </div>
                
                <div className="query-chart-container">
                    <canvas ref={chartRef} height="300"></canvas>
                </div>
            </div>

            <div className="query-table-wrapper">
                <table className="query-data-table">
                    <thead>
                        <tr>
                            <th>Client Name</th>
                            <th>Email</th>
                            <th>Message</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Response</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredQueries.length > 0 ? (
                            filteredQueries.map((query) => (
                                <tr key={query.id} className={`query-row ${query.status}`}>
                                    <td>{query.customer_name || 'N/A'}</td>
                                    <td>
                                        <a href={`mailto:${query.customer_email}`}>
                                            {query.customer_email || 'N/A'}
                                        </a>
                                    </td>
                                    <td className="query-message">
                                        <div className="message-content">
                                            {query.message}
                                        </div>
                                    </td>
                                    <td>{formatDate(query.created_at)}</td>
                                    <td>
                                        {getStatusBadge(query)}
                                    </td>
                                    <td className="query-response-cell">
                                        {query.status === "pending" ? (
                                            <div className="response-form">
                                                <textarea
                                                    value={responses[query.id] || ""}
                                                    onChange={(e) => handleResponseChange(query.id, e.target.value)}
                                                    placeholder="Type your response here..."
                                                    rows={3}
                                                />
                                                <button
                                                    className="send-response-button"
                                                    onClick={() => handleRespond(query.id)}
                                                >
                                                    Send Response
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="response-display">
                                                <strong>Response:</strong>
                                                <div className="response-text">
                                                    {query.auto_reply || "No response recorded"}
                                                    {query.response_type === 'auto' && (
                                                        <span className="auto-reply-tag">(Auto-generated)</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr className="no-results-row">
                                <td colSpan="6">
                                    No queries found matching your criteria
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QueryManagement;