require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Admin Credentials from .env file
const ADMIN_USER = process.env.ADMIN_USER || "Chamara";
const ADMIN_PASS = process.env.ADMIN_PASS || "Chamara@11";
const activeAdminTokens = new Set();

app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- MONGOOSE SCHEMAS & MODELS ---
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    stockStatus: { type: String, default: 'In Stock' },
    colors: { type: String, default: '' },
    description: { type: String, default: '' },
    images: [String]
});

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);

// Seed default categories if database is empty
async function seedDefaultCategories() {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany([
                { name: "Saree" },
                { name: "Toys" },
                { name: "Watch" }
            ]);
            console.log("Default categories seeded");
        }
    } catch (err) {
        console.error("Error seeding categories:", err);
    }
}

mongoose.connection.once('open', () => {
    seedDefaultCategories();
});

// --- STATIC FILES & HOMEPAGE ROUTE ---
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

// --- SECURITY MIDDLEWARE ---
const verifyAdminAuth = (req, res, next) => {
    const clientToken = req.headers['x-admin-token'];
    if (!clientToken || !activeAdminTokens.has(clientToken)) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login first." });
    }
    next();
};

// --- PUBLIC API ENDPOINTS ---
app.get('/api/store-data', async (req, res) => {
    try {
        const products = await Product.find({});
        const categoriesDocs = await Category.find({});
        const categories = categoriesDocs.map(c => c.name);
        
        res.status(200).json({ 
            success: true, 
            data: { categories, products } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
});

// --- PROTECTED ADMIN API ENDPOINTS ---

// 1. Add Product
app.post('/api/products', verifyAdminAuth, async (req, res) => {
    try {
        const { title, category, price, stockStatus, colors, description, images } = req.body;
        
        if (!title || !category || !price) {
            return res.status(400).json({ success: false, message: "Title, Category, and Price are required." });
        }

        let productImages = [];
        if (Array.isArray(images) && images.length > 0) {
            productImages = images.filter(img => img.trim() !== '');
        }

        const newProduct = new Product({
            title,
            category,
            price: parseFloat(price),
            stockStatus: stockStatus || 'In Stock',
            colors: colors || '',
            description: description || '',
            images: productImages.length > 0 ? productImages : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500']
        });

        await newProduct.save();
        res.status(201).json({ success: true, message: "Product added successfully", product: newProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add product", error: error.message });
    }
});

// 2. Update Product
app.put('/api/products/:id', verifyAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, category, price, stockStatus, colors, description, images } = req.body;
        
        if (!title || !category || !price) {
            return res.status(400).json({ success: false, message: "Title, Category, and Price are required." });
        }

        let productImages = [];
        if (Array.isArray(images) && images.length > 0) {
            productImages = images.filter(img => img.trim() !== '');
        }

        const updateData = {
            title,
            category,
            price: parseFloat(price),
            stockStatus: stockStatus || 'In Stock',
            colors: colors || '',
            description: description || ''
        };

        if (productImages.length > 0) {
            updateData.images = productImages;
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product updated successfully", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
    }
});

// 3. Delete Product
app.delete('/api/products/:id', verifyAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
    }
});

// 4. Add Category
app.post('/api/categories', verifyAdminAuth, async (req, res) => {
    try {
        const { category } = req.body;
        if (!category) return res.status(400).json({ success: false, message: "Category is required." });
        
        const existing = await Category.findOne({ name: category });
        if (existing) return res.status(400).json({ success: false, message: "Already exists." });

        await Category.create({ name: category });
        const categoriesDocs = await Category.find({});
        const categories = categoriesDocs.map(c => c.name);

        res.status(201).json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Delete Category
app.delete('/api/categories/:name', verifyAdminAuth, async (req, res) => {
    try {
        const categoryName = req.params.name;
        await Category.findOneAndDelete({ name: categoryName });
        
        const categoriesDocs = await Category.find({});
        const categories = categoriesDocs.map(c => c.name);

        res.status(200).json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- RENDER PORT BINDING ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});