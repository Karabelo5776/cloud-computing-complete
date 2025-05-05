// src/pages/ProductCatalog.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './ProductCatalog.css';
import axios from 'axios';

// Default images for each product type
const defaultImages = {
  ram: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
  hard_drive: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
  motherboard: 'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  cpu: 'https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  default: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'
};

const ProductCatalog = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

 /*
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/products');
        // Convert price to number and add image URLs
        const productsWithImages = response.data.map(product => ({
          ...product,
          price: parseFloat(product.price) || 0, // More robust number conversion
          image_url: product.image_url || getDefaultImage(product.name)
        }));
        setProducts(productsWithImages);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error('Error fetching products:', err);
      }
    };

    fetchProducts();
  }, []);
*/
useEffect(() => {
  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      // Map backend fields to frontend expected fields
      const productsWithImages = response.data.map(product => ({
        ...product,
        // Use currentPrice from backend and fallback to 0
        price: parseFloat(product.currentPrice) || 0,
        image_url: product.image_url || getDefaultImage(product.name)
      }));
      setProducts(productsWithImages);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching products:', err);
    }
  };

  fetchProducts();
}, []);

  const getDefaultImage = (productName) => {
    const name = productName.toLowerCase();
    if (name.includes('ram') || name.includes('memory')) return defaultImages.ram;
    if (name.includes('hard') || name.includes('drive') || name.includes('hdd') || name.includes('ssd')) 
      return defaultImages.hard_drive;
    if (name.includes('motherboard') || name.includes('board')) return defaultImages.motherboard;
    if (name.includes('cpu') || name.includes('processor')) return defaultImages.cpu;
    return defaultImages.default;
  };

  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'all' || 
                         product.name.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading products: {error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="product-catalog">
      <motion.button
        onClick={() => navigate('/')}
        className="back-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ← Back to Home
      </motion.button>

      <div className="catalog-header">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Our <span className="highlight">Product Catalog</span>
        </motion.h1>
        <p>Browse our selection of quality electronic components</p>
      </div>

      <div className="product-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="search-button">
            <i className="fas fa-search"></i>
          </button>
        </div>

        <div className="filter-controls">
          <label>Filter by type:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Products</option>
            <option value="ram">RAM/Memory</option>
            <option value="hard">Hard Drives</option>
            <option value="motherboard">Motherboards</option>
            <option value="cpu">Processors</option>
          </select>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="no-results">
          <p>No products found matching your criteria.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <motion.div 
              key={product.id}
              className="product-card"
              whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="product-image">
                <img 
                  src={product.image_url} 
                  alt={`${product.name}`}
                  onError={(e) => {
                    e.target.src = getDefaultImage(product.name);
                  }}
                />
                {product.quantity <= 0 && (
                  <div className="out-of-stock">Out of Stock</div>
                )}
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-meta">
                <span className="product-price">
                    M{product.price.toFixed(2)}
                  </span>
                  {product.quantity > 0 && (
                    <span className="product-stock">{product.quantity} in stock</span>
                  )}
                </div>
                <div className="product-actions">
                  <button 
                    className="inquiry-button"
                    onClick={() => navigate(`#product/${product.id}`)}
                  >
                    Visit our
                  </button>
                  {product.quantity > 0 && (
                    <button 
                      className="buy-button"
                      onClick={() => navigate(`#order/${product.id}`)}
                    >
                      Nearest stores
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;