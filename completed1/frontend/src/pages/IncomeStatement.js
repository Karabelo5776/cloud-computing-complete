import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import "./IncomeStatement.css";

// Set up axios interceptor for auth token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

const IncomeStatement = () => {
    const [financialData, setFinancialData] = useState({
        revenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        netProfit: 0,
        expenseBreakdown: {
            purchaseCosts: 0,        // Added for purchase costs (COGS)
            inventoryExpenses: 0,    // Renamed from productPurchases for clarity
            otherExpenses: 0
        },
        loading: true,
        error: null
    });
    const [period, setPeriod] = useState("monthly");
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setFinancialData(prev => ({ ...prev, loading: true, error: null }));
            
            const response = await axios.get("http://localhost:5000/finance/summary", {
                params: { period }
            });
            
            setFinancialData({
                revenue: response.data.revenue || 0,
                costOfGoodsSold: response.data.costOfGoodsSold || 0,
                grossProfit: response.data.grossProfit || 0,
                operatingExpenses: response.data.operatingExpenses || 0,
                netProfit: response.data.netProfit || 0,
                expenseBreakdown: {
                    purchaseCosts: response.data.expenseBreakdown?.totalPurchaseCosts || 0,
                    inventoryExpenses: response.data.expenseBreakdown?.productPurchases || 0,
                    otherExpenses: response.data.expenseBreakdown?.otherExpenses || 0
                },
                loading: false,
                error: null
            });
        } catch (err) {
            console.error("Error fetching financial data:", {
                message: err.message,
                response: err.response?.data,
                stack: err.stack
            });
            setFinancialData({
                revenue: 0,
                costOfGoodsSold: 0,
                grossProfit: 0,
                operatingExpenses: 0,
                netProfit: 0,
                expenseBreakdown: {
                    purchaseCosts: 0,
                    inventoryExpenses: 0,
                    otherExpenses: 0
                },
                loading: false,
                error: err.response?.data?.error || 
                      err.response?.data?.message || 
                      "Failed to load financial data"
            });
            if (err.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, navigate]);

    // Enhanced chart data with breakdowns
    const financeChartData = [
        { 
            category: "Revenue", 
            amount: financialData.revenue 
        },
        { 
            category: "COGS", 
            amount: financialData.costOfGoodsSold,
            breakdown: {
                purchaseCosts: financialData.expenseBreakdown.purchaseCosts
            }
        },
        { 
            category: "Gross Profit", 
            amount: financialData.grossProfit 
        },
        { 
            category: "Expenses", 
            amount: financialData.operatingExpenses,
            breakdown: {
                inventoryExpenses: financialData.expenseBreakdown.inventoryExpenses,
                otherExpenses: financialData.expenseBreakdown.otherExpenses
            }
        },
        { 
            category: "Net Profit", 
            amount: financialData.netProfit 
        },
    ];

    const formatCurrency = (value) => {
        return `M${Number(value).toFixed(2)}`;
    };

    const handlePeriodChange = (e) => {
        setPeriod(e.target.value);
    };

    const handleGenerateStatement = async () => {
        try {
            const currentDate = new Date();
            const response = await axios.post("http://localhost:5000/income-statements/generate", {
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear()
            });
            alert(`Income statement generated for ${response.data.month}`);
            fetchData();
        } catch (error) {
            console.error("Error generating statement:", error);
            alert(error.response?.data?.error || "Failed to generate statement");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="label">{label}</p>
                    <p className="amount">${formatCurrency(data.amount)}</p>
                    
                    {label === "COGS" && data.breakdown && (
                        <div className="expense-breakdown">
                            <p>↳ Purchase Costs: ${formatCurrency(data.breakdown.purchaseCosts)}</p>
                        </div>
                    )}
                    
                    {label === "Expenses" && data.breakdown && (
                        <div className="expense-breakdown">
                            <p>↳ Inventory Expenses: ${formatCurrency(data.breakdown.inventoryExpenses)}</p>
                            <p>↳ Other Expenses: ${formatCurrency(data.breakdown.otherExpenses)}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (financialData.loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading financial data...</p>
            </div>
        );
    }

    if (financialData.error) {
        return (
            <div className="error-container">
                <div className="error-message">{financialData.error}</div>
                <button onClick={fetchData} className="retry-button">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="income-statement-container">
            <div className="header-section">
                <h2>Income Statement</h2>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>

            <div className="period-selector">
                <label htmlFor="period-select">Time Period:</label>
                <select 
                    id="period-select"
                    value={period} 
                    onChange={handlePeriodChange}
                    disabled={financialData.loading}
                >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>

                <button 
                    onClick={handleGenerateStatement}
                    className="generate-btn"
                    disabled={financialData.loading}
                >
                    Generate Current Month Statement
                </button>
            </div>

            <div className="financial-summary-section">
                <h3>Financial Summary ({period})</h3>
                <table className="financial-summary-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Amount (M)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Revenue</td>
                            <td>{formatCurrency(financialData.revenue)}</td>
                        </tr>
                        <tr>
                            <td>Cost of Goods Sold</td>
                            <td>{formatCurrency(financialData.costOfGoodsSold)}</td>
                        </tr>
                        <tr className="expense-detail">
                            <td>↳ Purchase Costs</td>
                            <td>{formatCurrency(financialData.expenseBreakdown.purchaseCosts)}</td>
                        </tr>
                        <tr className="highlight-row">
                            <td>Gross Profit</td>
                            <td>{formatCurrency(financialData.grossProfit)}</td>
                        </tr>
                        <tr>
                            <td>Operating Expenses</td>
                            <td>{formatCurrency(financialData.operatingExpenses)}</td>
                        </tr>
                        <tr className="expense-detail">
                            <td>↳ Inventory Expenses</td>
                            <td>{formatCurrency(financialData.expenseBreakdown.inventoryExpenses)}</td>
                        </tr>
                        <tr className="expense-detail">
                            <td>↳ Other Expenses</td>
                            <td>{formatCurrency(financialData.expenseBreakdown.otherExpenses)}</td>
                        </tr>
                        <tr className={financialData.netProfit >= 0 ? "profit-row" : "loss-row"}>
                            <td>Net Profit</td>
                            <td>{formatCurrency(financialData.netProfit)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="chart-section">
                <h3>Financial Overview</h3>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={financeChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                                dataKey="amount" 
                                fill="#8884d8" 
                                name="Amount"
                            >
                                {financeChartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={
                                            entry.category === "Net Profit" ? 
                                                (entry.amount >= 0 ? "#4CAF50" : "#F44336") :
                                            entry.category === "Gross Profit" ?
                                                "#82ca9d" :
                                            entry.category === "COGS" ?
                                                "#ffc658" :
                                            "#8884d8"
                                        } 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default IncomeStatement;