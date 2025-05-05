import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import './ClientPurchase.css';

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

const ClientPurchase = () => {
    const API_BASE = "http://localhost:5000";
    const [purchaseData, setPurchaseData] = useState({ 
        productId: "", 
        quantity: 1 
    });
    const [paymentData, setPaymentData] = useState({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardName: ""
    });
    const [response, setResponse] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState({
        start: "",
        end: ""
    });
    const [selectedProduct, setSelectedProduct] = useState(null);
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
            fetchAvailableProducts();
            fetchPurchaseHistory(user.email);
        }
    }, [navigate]);

    const fetchAvailableProducts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/products`);
            setProducts(res.data);
            setError("");
        } catch (err) {
            console.error("Error fetching products:", err);
            setError("Failed to load available products");
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchaseHistory = async (email) => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/client-purchases`, {
                params: { email }
            });
            setPurchaseHistory(res.data);
            setError("");
        } catch (err) {
            console.error("Error fetching purchase history:", err);
            setError("Failed to load purchase history");
            if (err.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProductSelect = (e) => {
        const productId = e.target.value;
        setPurchaseData(prev => ({ ...prev, productId }));
        
        const product = products.find(p => p._id === productId);
        setSelectedProduct(product);
    };

    const filteredPurchases = purchaseHistory.filter(purchase => {
        const matchesSearch = purchase.productName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || purchase.orderStatus === statusFilter;
        
        let matchesDate = true;
        if (dateRange.start || dateRange.end) {
            const purchaseDate = new Date(purchase.saleDate);
            if (dateRange.start) {
                const startDate = new Date(dateRange.start);
                matchesDate = matchesDate && purchaseDate >= startDate;
            }
            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59);
                matchesDate = matchesDate && purchaseDate <= endDate;
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handlePurchaseChange = (e) => {
        const { name, value } = e.target;
        const quantity = name === 'quantity' ? Math.max(0, parseInt(value) || 0) : value;
        setPurchaseData(prev => ({ ...prev, [name]: quantity }));
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;

        if (name === "cardNumber") {
            const formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
            setPaymentData(prev => ({ ...prev, [name]: formattedValue }));
            return;
        }

        if (name === "expiryDate" && value.length === 2 && !value.includes('/')) {
            setPaymentData(prev => ({ ...prev, [name]: value + '/' }));
            return;
        }

        setPaymentData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitPurchase = async (e) => {
        e.preventDefault();
        
        if (!purchaseData.productId || purchaseData.quantity < 0) {
            setError("Please select a product and valid quantity");
            return;
        }

        if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardName) {
            setError("Please complete payment information");
            return;
        }

        setLoading(true);
        setError("");
        setResponse("");

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.email) {
                throw new Error("User information missing");
            }

            const res = await axios.post(`${API_BASE}/api/place-order`, {
                productId: purchaseData.productId,
                quantity: purchaseData.quantity,
                email: user.email,
                name: user.name
            });

            setResponse(`Purchase successful! Order ID: ${res.data.orderId}`);
            setPurchaseData({ productId: "", quantity: 1 });
            setPaymentData({ cardNumber: "", expiryDate: "", cvv: "", cardName: "" });
            
            // Refresh data
            await fetchAvailableProducts();
            await fetchPurchaseHistory(user.email);
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Failed to complete purchase");
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplay = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending': return 'Pending';
            case 'processing': return 'Processing';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            case 'refunded': return 'Refunded';
            default: return status || 'Unknown';
        }
    };

    return (
        <div className="client-purchase-container">
            <header>
                <h2>Client Dashboard</h2>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
                <nav>
                    <Link to="/clientpurchase" className="nav-link active">Make Purchase</Link>
                    <Link to="/clientquery" className="nav-link">Submit Query</Link>
                </nav>
            </header>

            <div className="purchase-content">
                <form onSubmit={handleSubmitPurchase} className="purchase-form">
                    <h3>Make a Purchase</h3>
                    
                    <div className="form-group">
                        <label>Select Product:</label>
                        <select 
                            name="productId" 
                            value={purchaseData.productId} 
                            onChange={handleProductSelect} 
                            required
                            disabled={loading}
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(product => (
                                <option 
                                    key={product._id} 
                                    value={product._id}
                                    disabled={product.quantity <= 0}
                                >
                                    {product.name} - M{product.currentPrice.toFixed(2)} ({product.quantity} available)
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedProduct && (
                        <div className="product-details">
                            <p><strong>Price:</strong> M{selectedProduct.currentPrice.toFixed(2)}</p>
                            <p><strong>Available:</strong> {selectedProduct.quantity}</p>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Quantity:</label>
                        <input 
                            type="number" 
                            name="quantity" 
                            value={purchaseData.quantity} 
                            onChange={handlePurchaseChange} 
                            required 
                            min="0"
                            max={selectedProduct?.quantity || 1}
                            placeholder="Enter quantity"
                            disabled={!purchaseData.productId || loading}
                        />
                    </div>

                    <div className="payment-section">
                        <h4>Payment Information</h4>
                        
                        <div className="form-group">
                            <label>Card Number:</label>
                            <input
                                type="text"
                                name="cardNumber"
                                value={paymentData.cardNumber}
                                onChange={handlePaymentChange}
                                maxLength="19"
                                placeholder="1234 5678 9012 3456"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label>Name on Card:</label>
                            <input
                                type="text"
                                name="cardName"
                                value={paymentData.cardName}
                                onChange={handlePaymentChange}
                                placeholder="Bra Sthola"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Expiry Date:</label>
                                <input
                                    type="text"
                                    name="expiryDate"
                                    value={paymentData.expiryDate}
                                    onChange={handlePaymentChange}
                                    maxLength="5"
                                    placeholder="MM/YY"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>CVV:</label>
                                <input
                                    type="text"
                                    name="cvv"
                                    value={paymentData.cvv}
                                    onChange={handlePaymentChange}
                                    maxLength="4"
                                    placeholder="123"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !purchaseData.productId}
                        className="submit-btn"
                    >
                        {loading ? "Processing..." : "Complete Purchase"}
                    </button>
                </form>

                <div className="purchase-history">
                    <h3>Your Purchase History</h3>
                    
                    <div className="search-section">
                        <div className="search-group">
                            <input
                                type="text"
                                placeholder="Search by product name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="filter-group">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                disabled={loading}
                            >
                                <option value="all">All Transactions</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        
                        <div className="date-filter-group">
                            <label>From:</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                disabled={loading}
                            />
                            
                            <label>To:</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                disabled={loading}
                            />
                            
                            <button 
                                type="button" 
                                onClick={() => setDateRange({ start: "", end: "" })}
                                className="clear-btn"
                                disabled={loading}
                            >
                                Clear Dates
                            </button>
                        </div>
                    </div>

                    <p className="results-count">
                        Showing {filteredPurchases.length} of {purchaseHistory.length} transactions
                    </p>

                    {loading ? (
                        <div className="loading-message">Loading purchase history...</div>
                    ) : filteredPurchases.length > 0 ? (
                        <table className="purchase-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPurchases.map((purchase) => (
                                    <tr key={purchase._id}>
                                        <td>{new Date(purchase.saleDate).toLocaleString()}</td>
                                        <td>{purchase.productName}</td>
                                        <td>{purchase.quantity}</td>
                                        <td>M{purchase.salePrice?.toFixed(2)}</td>
                                        <td>M{purchase.totalPrice?.toFixed(2)}</td>
                                        <td className={`status status-${purchase.orderStatus?.toLowerCase()}`}>
                                            {getStatusDisplay(purchase.orderStatus)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="no-purchases">
                            {purchaseHistory.length === 0 ? 'No purchases made yet' : 'No transactions match your search'}
                        </p>
                    )}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}
            {response && <div className="success-message">{response}</div>}
        </div>
    );
};

export default ClientPurchase;