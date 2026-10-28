require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Admin Credentials from .env file
const ADMIN_USER = process.env.ADMIN_USER || "Chamara";
const ADMIN_PASS = process.env.ADMIN_PASS || "Chamara@11";

// Store active session tokens in memory
const activeAdminTokens = new Set();

app.use(cors());
app.use(express.json());

// --- STATIC FILES & HOMEPAGE ROUTE ---
// Serve static files (HTML, CSS, images, etc.) from the root directory
app.use(express.static(path.join(__dirname)));

// Explicit route for homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const dbPath = path.join(__dirname, 'data.json');

const readDB = () => {
    if (!fs.existsSync(dbPath)) {
        const initialData = { categories: ["Saree", "Toys", "Watch"], products: [] };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
};

const writeDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// --- ADMIN LOGIN ENDPOINT ---
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        activeAdminTokens.add(token);
        return res.status(200).json({ success: true, token, message: "Login successful" });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

// --- SECURITY MIDDLEWARE FOR ADMIN ACTIONS ---
const verifyAdminAuth = (req, res, next) => {
    const clientToken = req.headers['x-admin-token'];
    if (!clientToken || !activeAdminTokens.has(clientToken)) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login first." });
    }
    next();
};

// --- PUBLIC API ENDPOINTS ---
app.get('/api/store-data', (req, res) => {
    try {
        const db = readDB();
        res.status(200).json({ success: true, data: db });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
});

// --- PROTECTED ADMIN API ENDPOINTS ---

// 1. Add Product
app.post('/api/products', verifyAdminAuth, (req, res) => {
    try {
        const { title, category, price, stockStatus, colors, description, images } = req.body;
        
        if (!title || !category || !price) {
            return res.status(400).json({ success: false, message: "Title, Category, and Price are required." });
        }

        let productImages = [];
        if (Array.isArray(images) && images.length > 0) {
            productImages = images.filter(img => img.trim() !== '');
        }

        const db = readDB();
        const newProduct = {
            id: Date.now().toString(),
            title,
            category,
            price: parseFloat(price),
            stockStatus: stockStatus || 'In Stock',
            colors: colors || '',
            description: description || '',
            images: productImages.length > 0 ? productImages : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500']
        };

        db.products.push(newProduct);
        writeDB(db);

        res.status(201).json({ success: true, message: "Product added successfully", product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add product", error: error.message });
    }
});

// 2. Update Product
app.put('/api/products/:id', verifyAdminAuth, (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, price, stockStatus, colors, description, images } = req.body;
        
        if (!title || !category || !price) {
            return res.status(400).json({ success: false, message: "Title, Category, and Price are required." });
        }

        const db = readDB();
        const index = db.products.findIndex(p => p.id === id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let productImages = [];
        if (Array.isArray(images) && images.length > 0) {
            productImages = images.filter(img => img.trim() !== '');
        }

        db.products[index] = {
            ...db.products[index],
            title,
            category,
            price: parseFloat(price),
            stockStatus: stockStatus || 'In Stock',
            colors: colors || '',
            description: description || '',
            images: productImages.length > 0 ? productImages : db.products[index].images
        };

        writeDB(db);
        res.status(200).json({ success: true, message: "Product updated successfully", product: db.products[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
    }
});

// 3. Delete Product
app.delete('/api/products/:id', verifyAdminAuth, (req, res) => {
    try {
        const { id } = req.params;
        const db = readDB();
        db.products = db.products.filter(p => p.id !== id);
        writeDB(db);
        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
    }
});

// 4. Add Category
app.post('/api/categories', verifyAdminAuth, (req, res) => {
    try {
        const { category } = req.body;
        if (!category) return res.status(400).json({ success: false, message: "Category is required." });
        const db = readDB();
        if (db.categories.includes(category)) return res.status(400).json({ success: false, message: "Already exists." });
        db.categories.push(category);
        writeDB(db);
        res.status(201).json({ success: true, categories: db.categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Delete Category
app.delete('/api/categories/:name', verifyAdminAuth, (req, res) => {
    try {
        const categoryName = req.params.name;
        const db = readDB();
        db.categories = db.categories.filter(c => c !== categoryName);
        writeDB(db);
        res.status(200).json({ success: true, categories: db.categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});