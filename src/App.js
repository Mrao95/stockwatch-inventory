import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 0, price: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false); // Track updates

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // OPTIMIZED: Add product with instant UI update
  const addProduct = async () => {
    if (!newProduct.name.trim()) {
      alert('Please enter a product name');
      return;
    }

    // Create temporary product for instant display
    const tempId = 'temp-' + Date.now();
    const newProductData = {
      id: tempId,
      name: newProduct.name,
      quantity: parseInt(newProduct.quantity) || 0,
      price: parseFloat(newProduct.price) || 0,
      lastUpdated: new Date().toISOString()
    };

    // Update UI immediately (optimistic update)
    setProducts([...products, newProductData]);
    setNewProduct({ name: '', quantity: 0, price: 0 });

    try {
      // Send to server in background
      const url = `${API_URL}?action=add&name=${encodeURIComponent(newProduct.name)}&quantity=${parseInt(newProduct.quantity) || 0}&price=${parseFloat(newProduct.price) || 0}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        // Refresh to get real ID from server
        await fetchProducts();
      } else {
        // If failed, remove the temp product
        setProducts(products => products.filter(p => p.id !== tempId));
        alert('Failed to add product');
      }
    } catch (err) {
      // Remove temp product on error
      setProducts(products => products.filter(p => p.id !== tempId));
      alert('Error adding product');
    }
  };

  // OPTIMIZED: Update quantity with instant UI update
  const updateQuantity = async (id, change) => {
    // Find the product
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Calculate new quantity
    const newQuantity = product.quantity + change;
    if (newQuantity < 0) return;

    // Update UI immediately (optimistic update)
    setProducts(products.map(p => 
      p.id === id ? { ...p, quantity: newQuantity } : p
    ));

    // Send update to server in background
    try {
      const url = `${API_URL}?action=update&id=${id}&change=${change}`;
      await fetch(url);
      // No need to refresh - UI already updated
    } catch (err) {
      // Revert on error
      setProducts(products.map(p => 
        p.id === id ? { ...p, quantity: product.quantity } : p
      ));
      alert('Error updating quantity');
    }
  };

  // OPTIMIZED: Delete with instant UI update
  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;

    // Find product name for message
    const product = products.find(p => p.id === id);
    
    // Remove from UI immediately
    setProducts(products.filter(p => p.id !== id));

    // Send delete to server in background
    try {
      const url = `${API_URL}?action=delete&id=${id}`;
      await fetch(url);
      // Success - no action needed
    } catch (err) {
      // Revert on error
      await fetchProducts(); // Refresh to get correct state
      alert('Error deleting product');
    }
  };

  const handleInputChange = (e) => {
    setNewProduct({
      ...newProduct,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>📦 StockWatch Inventory Manager</h1>
        <p>⚡ Instant updates - No waiting!</p>
      </header>

      {/* Add Product Form */}
      <div className="add-form">
        <h2>Add New Product</h2>
        <div className="form-group">
          <input
            type="text"
            name="name"
            placeholder="Product Name*"
            value={newProduct.name}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            value={newProduct.quantity}
            onChange={handleInputChange}
          />
          <input
            type="number"
            name="price"
            placeholder="Price ($)"
            step="0.01"
            value={newProduct.price}
            onChange={handleInputChange}
          />
          <button onClick={addProduct}>➕ Add Product</button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <h2>Current Inventory ({products.length} items)</h2>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  No products yet. Add your first product above!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className={product.quantity < 10 ? 'low-stock' : ''}>
                  <td className="product-name">{product.name}</td>
                  <td className="quantity">
                    <button 
                      className="quantity-btn minus"
                      onClick={() => updateQuantity(product.id, -1)}
                      disabled={product.quantity <= 0}
                    >
                      -
                    </button>
                    <span className="quantity-value">{product.quantity}</span>
                    <button 
                      className="quantity-btn plus"
                      onClick={() => updateQuantity(product.id, 1)}
                    >
                      +
                    </button>
                  </td>
                  <td>${parseFloat(product.price).toFixed(2)}</td>
                  <td>${(product.quantity * product.price).toFixed(2)}</td>
                  <td>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteProduct(product.id)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="summary">
        <div className="summary-card">
          <span className="summary-label">Total Products:</span>
          <span className="summary-value">{products.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Value:</span>
          <span className="summary-value">
            ${products.reduce((sum, p) => sum + (p.quantity * p.price), 0).toFixed(2)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Low Stock Items:</span>
          <span className="summary-value">
            {products.filter(p => p.quantity < 10).length}
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;