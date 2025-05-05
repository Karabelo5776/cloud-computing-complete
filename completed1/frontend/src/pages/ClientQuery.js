import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './ClientQuery.css';

const ClientQuery = () => {
    const API_BASE = "http://localhost:5000/api";
    const [formData, setFormData] = useState({ 
        name: "", 
        email: "", 
        message: "" 
    });
    const [response, setResponse] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [queries, setQueries] = useState([]);
    const [showAutoReplyInfo, setShowAutoReplyInfo] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));

            if (!token || !user || user.role !== 'client') {
                navigate('/login');
                return false;
            }
            return true;
        };

        if (checkAuth()) {
            const user = JSON.parse(localStorage.getItem('user'));
            setFormData({
                name: user.name || "",
                email: user.email || "",
                message: ""
            });
            fetchQueries(user.email);
        }
    }, [navigate]);

    const fetchQueries = async (email) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/my-queries?email=${email}`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to fetch queries");
            }
            
            const data = await res.json();
            
            if (!data || !Array.isArray(data)) {
                throw new Error("Invalid data format received");
            }

            const transformedQueries = data.map(query => ({
                id: query._id,
                customer_name: query.customerName,
                customer_email: query.customerEmail,
                message: query.message,
                created_at: query.createdAt,
                auto_reply: query.autoReply,
                status: query.status === 'complete' ? 'Completed' : 'Pending',
                response_type: query.responseType
            }));
            
            setQueries(transformedQueries);
        } catch (err) {
            console.error("Error fetching queries:", err);
            setError(err.message || "Failed to load query history");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitQuery = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) {
            setError("Please enter your query message");
            return;
        }

        setLoading(true);
        setError("");
        setResponse("");

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/submit-query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    message: formData.message
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to submit query");
            }

            setResponse(data.message || "Your query has been received and is under review.");
            setFormData(prev => ({ ...prev, message: "" }));
            
            // Refresh the query list
            await fetchQueries(formData.email);
            
            // Show info about auto-replies if this was an auto-reply
            if (data.message && data.message !== "Your query has been received and is under review.") {
                setShowAutoReplyInfo(true);
                setTimeout(() => setShowAutoReplyInfo(false), 5000);
            }
        } catch (err) {
            setError(err.message || "Server error, please try again later.");
        } finally {
            setLoading(false);
        }
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

    const getResponseDisplay = (query) => {
        if (!query.auto_reply) {
            return <span className="pending-response">Waiting for response...</span>;
        }
        
        return (
            <div className="response-content">
                {query.auto_reply}
                {query.response_type === 'auto' && (
                    <span className="auto-reply-tag">(Auto-generated response)</span>
                )}
            </div>
        );
    };

    return (
        <div className="client-query-container">
            <header>
                <h2>Client Dashboard</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
                <nav>
                    <Link to="/clientpurchase" className="nav-link">Make Purchase</Link>
                    <Link to="/clientquery" className="nav-link active">Submit Query</Link>
                </nav>
            </header>

            <div className="query-content">
                <form onSubmit={handleSubmitQuery} className="query-form">
                    <h3>Submit a Query</h3>
                    <div className="form-group">
                        <label>Name</label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            disabled
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            disabled
                        />
                    </div>
                    <div className="form-group">
                        <label>Message</label>
                        <textarea 
                            name="message" 
                            value={formData.message} 
                            onChange={handleChange} 
                            required 
                            placeholder="Enter your query here..." 
                            rows={5}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="submit-btn"
                    >
                        {loading ? "Submitting..." : "Submit Query"}
                    </button>
                    {showAutoReplyInfo && (
                        <div className="auto-reply-info">
                            <p>This response was automatically generated based on similar previous queries.</p>
                            <p>If you need more assistance, please reply to this message.</p>
                        </div>
                    )}
                </form>

                <div className="query-history">
                    <h3>Your Query History</h3>
                    {queries.length > 0 ? (
                        <div className="query-table-container">
                            <table className="query-table">
                                <thead>
                                    <tr>
                                        <th>Date Submitted</th>
                                        <th>Your Message</th>
                                        <th>Status</th>
                                        <th>Response</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queries.map(query => (
                                        <tr key={query.id} className={`query-row ${query.status.toLowerCase()}`}>
                                            <td>{formatDate(query.created_at)}</td>
                                            <td className="query-message">{query.message}</td>
                                            <td>
                                                <span className={`status-badge ${query.status.toLowerCase()}`}>
                                                    {query.status}
                                                </span>
                                            </td>
                                            <td className="response-cell">
                                                {getResponseDisplay(query)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="no-queries">No queries submitted yet</p>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {response && (
                <div className={`response-message ${
                    response.includes("Auto-generated") ? "auto-reply" : "manual-reply"
                }`}>
                    {response}
                </div>
            )}
        </div>
    );
};

export default ClientQuery;