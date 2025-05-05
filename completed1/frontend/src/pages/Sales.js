import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import './Sales.css';

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

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showStockWarning, setShowStockWarning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [salesRes, productsRes] = await Promise.all([
                    axios.get("http://localhost:5000/sales"),
                    axios.get("http://localhost:5000/api/products")  // Changed to /api/products
                ]);
                setSales(salesRes.data);
                setProducts(productsRes.data);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError(err.response?.data?.error || "Failed to fetch data");
                if (err.response?.status === 401) {
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleProductSelect = (e) => {
        const selectedId = e.target.value;
        setProductId(selectedId);
        setShowStockWarning(false);

        const product = products.find(p => p._id === selectedId);
        setSelectedProduct(product);
    };

    const handleAddSale = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!selectedProduct || quantity > selectedProduct.quantity) {
            setShowStockWarning(true);
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post("http://localhost:5000/sales", { 
                productId, 
                quantity 
            });
            
            // Update local state immediately for better UX
            const newSale = response.data.sale;
            setSales(prev => [newSale, ...prev]);
            
            // Update product quantity locally
            setProducts(prev => prev.map(p => 
                p._id === productId 
                    ? { ...p, quantity: p.quantity - quantity } 
                    : p
            ));
            
            // Reset form
            setQuantity(1);
            setProductId("");
            setSelectedProduct(null);
            
            showNotification("Sale recorded successfully!", "success");
        } catch (error) {
            console.error("Error adding sale:", error);
            setError(error.response?.data?.error || "Failed to record sale");
            showNotification(
                error.response?.data?.error || "Failed to record sale", 
                "error"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const showNotification = (message, type) => {
        const notification = document.createElement("div");
        notification.className = `sales-notification sales-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add("sales-notification-show");
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove("sales-notification-show");
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    };

    const salesData = sales.reduce((acc, sale) => {
        const productName = sale.productId?.name || sale.productName;
        const existingProduct = acc.find(item => item.product_name === productName);
        if (existingProduct) {
            existingProduct.total_sales += Number(sale.totalPrice);
        } else {
            acc.push({ 
                product_name: productName, 
                total_sales: Number(sale.totalPrice) 
            });
        }
        return acc;
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
    };

    return (
        <div className="sales-dashboard-unique">
            <div className="sales-nav-buttons-container">
                <button className="sales-nav-btn sales-products-btn" onClick={() => navigate("/products")}>
                    Add Products
                </button>
                <button className="sales-nav-btn sales-queries-btn" onClick={() => navigate("/queries")}>
                    Client Queries
                </button>
                <button className="sales-nav-btn sales-orders-btn" onClick={() => navigate("/orders")}>
                    View Online Purchases
                </button>
                <button className="sales-nav-btn sales-logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            <h2 className="sales-main-title">Sales Transactions</h2>

            {error && <div className="sales-error-message">{error}</div>}

            <form className="sales-form-unique" onSubmit={handleAddSale}>
                <div className="sales-product-info-container">
                    <select 
                        className="sales-product-select" 
                        value={productId} 
                        onChange={handleProductSelect} 
                        required
                        disabled={isLoading}
                    >
                        <option value="">Select Product</option>
                        {products.map(product => (
                            <option key={product._id} value={product._id}>
                                {product.name} - M{product.currentPrice?.toFixed(2)} ({product.quantity} in stock)
                            </option>
                        ))}
                    </select>
                    
                    {selectedProduct && (
                        <div className="sales-product-details">
                            <p><strong>Price:</strong> M{selectedProduct.currentPrice?.toFixed(2)}</p>
                            <p><strong>In Stock:</strong> {selectedProduct.quantity}</p>
                        </div>
                    )}
                </div>

                <div className="sales-quantity-container">
                    <input
                        className="sales-quantity-input"
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        min="1"
                        max={selectedProduct?.quantity || 1}
                        onChange={(e) => {
                            const value = Math.max(0, Number(e.target.value));
                            setQuantity(value);
                            setShowStockWarning(false);
                        }}
                        required
                        disabled={!productId || isLoading}
                    />
                    
                    <button 
                        className="sales-submit-btn" 
                        type="submit" 
                        disabled={!productId || quantity <= 0 || quantity > (selectedProduct?.quantity || 0) || isLoading}
                    >
                        {isLoading ? "Processing..." : "Record Sale"}
                    </button>
                </div>

                {showStockWarning && selectedProduct && (
                    <p className="sales-stock-warning">
                        Only {selectedProduct.quantity} units available!
                    </p>
                )}
            </form>

            <h3 className="sales-records-title">Sales Records</h3>
            <div className="sales-table-container">
                {isLoading ? (
                    <div className="sales-loading">Loading sales data...</div>
                ) : sales.length === 0 ? (
                    <div className="sales-empty">No sales records found</div>
                ) : (
                    <table className="sales-data-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total Price</th>
                                <th>Date Sold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((sale) => (
                                <tr key={sale._id}>
                                    <td>{sale.productId?.name || sale.productName}</td>
                                    <td>{sale.quantity}</td>
                                    <td>M{sale.salePrice?.toFixed(2)}</td>
                                    <td>M{sale.totalPrice?.toFixed(2)}</td>
                                    <td>{new Date(sale.saleDate).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {salesData.length > 0 && (
                <>
                    <h3 className="sales-chart-title">Sales Performance</h3>
                    <div className="sales-chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="product_name" />
                                <YAxis />
                                <Tooltip 
                                    formatter={(value) => [`M${value.toFixed(2)}`, "Total Sales"]}
                                    labelFormatter={(label) => `Product: ${label}`}
                                />
                                <Bar 
                                    dataKey="total_sales" 
                                    fill="#8884d8" 
                                    name="Total Sales" 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
};

export default Sales;