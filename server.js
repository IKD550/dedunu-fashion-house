const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ස්ටැටික් ෆයිල්ස් (HTML, CSS, JS සහ ෆ්‍රන්ට්එන්ඩ් ෆයිල්ස්) ලෝඩ් කිරීම සඳහා
app.use(express.static(path.join(__dirname, '.')));

// ==========================================
// 1. MONGODB ATLAS DATABASE CONNECTION
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
// 2. DATABASE SCHEMA & MODEL
// ==========================================
// Admin පැනලයෙන් එවෙන Categories සහ Products වැනි දත්ත JSON ලෙස ස්ටෝර් කිරීමට
const storeDataSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // උදාහරණයක් ලෙස: 'products', 'categories'
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const StoreData = mongoose.model('StoreData', storeDataSchema);

// ==========================================
// 3. ADMIN AUTHENTICATION MIDDLEWARE
// ==========================================
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  if (adminToken) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: Access denied' });
  }
};

// ==========================================
// 4. API ENDPOINTS (ROUTES)
// ==========================================

// අ) ඩේටා සේව් කිරීමට හෝ අප්ඩේට් කිරීමට (Admin පැනලයෙන්)
app.post('/store-data', verifyAdminToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !data) {
      return res.status(400).json({ success: false, message: 'Type and data are required' });
    }

    // එකම type එකක් යටතේ පවතින දත්ත අලුත් කරනු ලබයි (Upsert)
    await StoreData.findOneAndUpdate(
      { type: type },
      { data: data, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'Data saved to MongoDB successfully!' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ආ) ඩේටා ලබා ගැනීමට (Frontend සහ Admin පැනලය සඳහා)
app.get('/get-data', async (req, res) => {
  try {
    const dataList = await StoreData.find({});
    res.status(200).json(dataList);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 5. PAGE ROUTES
// ==========================================

// හෝම් පේජ් එක
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ඇඩ්මින් පේජ් එක
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