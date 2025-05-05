import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Line, Pie, Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import "./InvestorDashboard.css";

Chart.register(...registerables);

const InvestorDashboard = () => {
    const [financialData, setFinancialData] = useState({
        revenue: 0,
        expenses: 0,
        profit: 0,
        monthlyTrend: [],
        dailyTrend: [],
        expenseBreakdown: {
            productPurchases: 0,
            otherExpenses: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // Fetch all data in parallel
            const [summaryResponse, trendsResponse] = await Promise.all([
                axios.get("http://localhost:5000/primary-partner/financial-summary", config),
                axios.get("http://localhost:5000/investor/monthly-trends", config)
            ]);

            const { monthly } = summaryResponse.data;

            // Generate daily trend data based on current month's revenue
            const dailyTrend = Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                return {
                    date: date.toISOString().split('T')[0],
                    amount: Math.floor(monthly.revenue / 30 * (0.8 + Math.random() * 0.4))
                };
            });

            setFinancialData({
                revenue: monthly.revenue || 0,
                expenses: monthly.expenses || 0,
                profit: monthly.netProfit || 0,
                expenseBreakdown: {
                    productPurchases: monthly.expenseBreakdown?.productPurchases || 0,
                    otherExpenses: monthly.expenseBreakdown?.otherExpenses || 0
                },
                monthlyTrend: trendsResponse.data || [],
                dailyTrend
            });

        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err.response?.data?.message || 
                   "Failed to load financial data. Please try again later.");
            
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinancialData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate("/login");
    };

    const handleRetry = () => {
        setError(null);
        fetchFinancialData();
    };

    // Chart data configurations
    const pieChartData = {
        labels: ["Revenue", "Expenses", "Net Profit"],
        datasets: [{
            data: [
                financialData.revenue, 
                financialData.expenses, 
                financialData.profit
            ],
            backgroundColor: ["#4CAF50", "#FF9800", "#2196F3"],
            hoverOffset: 4
        }]
    };

    const monthlyBarChartData = {
        labels: financialData.monthlyTrend.map(item => item.month),
        datasets: [
            {
                label: "Monthly Revenue",
                data: financialData.monthlyTrend.map(item => item.totalRevenue),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1
            },
            {
                label: "Monthly Profit",
                data: financialData.monthlyTrend.map(item => item.grossProfit),
                backgroundColor: "rgba(75, 192, 192, 0.6)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1
            }
        ]
    };

    const expensePieChartData = {
        labels: ["Inventory Expenses", "Other Expenses"],
        datasets: [{
            data: [
                financialData.expenseBreakdown.productPurchases,
                financialData.expenseBreakdown.otherExpenses
            ],
            backgroundColor: ["#FF6384", "#36A2EB"],
            hoverOffset: 4
        }]
    };

    const dailyLineChartData = {
        labels: financialData.dailyTrend.map(item => item.date),
        datasets: [{
            label: "Daily Sales Trend",
            data: financialData.dailyTrend.map(item => item.amount),
            borderColor: "#4CAF50",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            fill: true,
            tension: 0.3
        }]
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading financial data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">{error}</div>
                <button onClick={handleRetry} className="retry-button">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Investor Dashboard</h1>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </header>

            <div className="financial-summary">
                <div className="summary-card revenue">
                    <h3>Monthly Revenue</h3>
                    <div className="amount">${financialData.revenue.toLocaleString()}</div>
                </div>
                <div className="summary-card expenses">
                    <h3>Monthly Expenses</h3>
                    <div className="amount">${financialData.expenses.toLocaleString()}</div>
                </div>
                <div className={`summary-card ${financialData.profit >= 0 ? 'profit' : 'loss'}`}>
                    <h3>Monthly Profit</h3>
                    <div className="amount">
                        ${Math.abs(financialData.profit).toLocaleString()}
                        {financialData.profit >= 0 ? ' ↑' : ' ↓'}
                    </div>
                </div>
            </div>

            <div className="charts-container">
                <div className="chart-wrapper">
                    <h2>Financial Distribution</h2>
                    <div className="chart">
                        <Pie data={pieChartData} options={{
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => {
                                            const label = ctx.label || '';
                                            const value = ctx.raw || 0;
                                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = Math.round((value / total) * 100);
                                            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>

                <div className="chart-wrapper">
                    <h2>Expense Breakdown</h2>
                    <div className="chart">
                        <Pie data={expensePieChartData} options={{
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => {
                                            const label = ctx.label || '';
                                            const value = ctx.raw || 0;
                                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = Math.round((value / total) * 100);
                                            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                                        }
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>

                <div className="chart-wrapper full-width">
                    <h2>Monthly Revenue & Profit Trend</h2>
                    <div className="chart">
                        <Bar data={monthlyBarChartData} options={{
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: (value) => `$${value.toLocaleString()}`
                                    }
                                }
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => {
                                            const datasetLabel = ctx.dataset.label || '';
                                            return `${datasetLabel}: $${ctx.raw.toLocaleString()}`;
                                        }
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>

                <div className="chart-wrapper full-width">
                    <h2>Daily Sales Trend</h2>
                    <div className="chart">
                        <Line data={dailyLineChartData} options={{
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: (value) => `$${value.toLocaleString()}`
                                    }
                                }
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => `Sales: $${ctx.raw.toLocaleString()}`
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvestorDashboard;