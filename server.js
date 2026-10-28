const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ස්ටැටික් ෆයිල්ස් ලෝඩ් කිරීම සඳහා
app.use(express.static(path.join(__dirname, '.')));

// ==========================================
// 1. MONGODB ATLAS CONNECTION
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://imeshkavinda550_db_user:GVvK8sRKWOVDsKV4@cluster0.w8vgaoy.mongodb.net/dedunu_fashion?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000 
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// ==========================================
// 2. DATABASE SCHEMA & INITIAL DATA MODEL
// ==========================================
const storeSchema = new mongoose.Schema({
  type: { type: String, default: 'main_store', unique: true },
  data: {
    categories: { type: [String], default: ['Sarees', 'Frocks', 'Shirts', 'Kurti'] },
    products: { type: Array, default: [] }
  }
});

const StoreData = mongoose.model('StoreData', storeSchema);

// Helper function to get or create store data
async function getOrCreateStore() {
  let store = await StoreData.findOne({ type: 'main_store' });
  if (!store) {
    store = new mongoose.model('StoreData')({
      type: 'main_store',
      data: {
        categories: ['Sarees', 'Frocks', 'Shirts', 'Kurti'],
        products: []
      }
    });
    await store.save();
  }
  return store;
}

// ==========================================
// 3. ADMIN AUTHENTICATION MIDDLEWARE
// ==========================================
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: Access denied' });
  }
};

// ==========================================
// 4. API ENDPOINTS (MATCHING FRONTEND)
// ==========================================

// අ) Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username) {
    // සාර්ථක ලෙස ලොග් වූ විට ටෝකන් එකක් ලබා දේ
    res.json({ success: true, token: 'admin-token-verified-123' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
  }
});

// ආ) Get All Store Data (Categories & Products)
app.get('/api/store-data', async (req, res) => {
  try {
    const store = await getOrCreateStore();
    res.json({ success: true, data: store.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ඇ) Add New Category
app.post('/api/store-data', verifyAdminToken, async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    let store = await getOrCreateStore();
    if (!store.data.categories.includes(category)) {
      store.data.categories.push(category);
      store.markModified('data');
      await store.save();
    }
    res.json({ success: true, data: store.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ඈ) Delete Category
app.delete('/api/categories/:name', verifyAdminToken, async (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    let store = await getOrCreateStore();
    store.data.categories = store.data.categories.filter(c => c !== categoryName);
    store.markModified('data');
    await store.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ඉ) Add Product
app.post('/api/products', verifyAdminToken, async (req, res) => {
  try {
    let store = await getOrCreateStore();
    const newProduct = {
      id: Date.now().toString(),
      ...req.body
    };
    store.data.products.push(newProduct);
    store.markModified('data');
    await store.save();
    res.json({ success: true, product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ஈ) Update Product
app.put('/api/products/:id', verifyAdminToken, async (req, res) => {
  try {
    const productId = req.params.id;
    let store = await getOrCreateStore();
    const index = store.data.products.findIndex(p => p.id === productId);
    
    if (index !== -1) {
      store.data.products[index] = { id: productId, ...req.body };
      store.markModified('data');
      await store.save();
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: 'Product not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// උ) Delete Product
app.delete('/api/products/:id', verifyAdminToken, async (req, res) => {
  try {
    const productId = req.params.id;
    let store = await getOrCreateStore();
    store.data.products = store.data.products.filter(p => p.id !== productId);
    store.markModified('data');
    await store.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. PAGE ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dedunu-secret-admin.html'));
});

// ==========================================
// 6. SERVER START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});