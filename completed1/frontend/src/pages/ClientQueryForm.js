import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './ClientQueryForm.css';

const ClientQueryForm = () => {
    const API_BASE = "http://localhost:5000/api";
    const [formData, setFormData] = useState({ name: "", email: "", message: "" });
    const [response, setResponse] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [queries, setQueries] = useState([]);
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
            const res = await fetch(`${API_BASE}/my-queries?email=${email}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            setQueries(data);
        } catch (err) {
            console.error("Error fetching queries:", err);
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
            const res = await fetch(`${API_BASE}/submit-query`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit query");

            setResponse(data.message);
            setFormData(prev => ({ ...prev, message: "" }));
            await fetchQueries(formData.email);
        } catch (err) {
            setError(err.message || "Server error, please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="client-query-container">
            <header>
                <h2>Client Dashboard</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
                <nav>
                    <Link to="/clientpurchase" className="nav-link">Make Purchase</Link>
                    <Link to="/clientqueryform" className="nav-link active">Submit Query</Link>
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
                        />
                    </div>
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? "Submitting..." : "Submit Query"}
                    </button>
                </form>

                <div className="query-history">
                    <h3>Your Query History</h3>
                    {queries.length > 0 ? (
                        <table className="query-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Message</th>
                                    <th>Status</th>
                                    <th>Response</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queries.map(query => (
                                    <tr key={query.id}>
                                        <td>{new Date(query.created_at).toLocaleString()}</td>
                                        <td>{query.message}</td>
                                        <td className={`status status-${query.status}`}>
                                            {query.status}
                                        </td>
                                        <td>{query.auto_reply || "Pending"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="no-queries">No queries submitted yet</p>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {response && <div className="success-message">{response}</div>}
        </div>
    );
};

export default ClientQueryForm;