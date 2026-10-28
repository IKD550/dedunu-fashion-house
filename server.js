const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ස්ටැටික් ෆයිල්ස් (HTML, CSS, JS) ලෝඩ් කිරීම සඳහා
app.use(express.static(path.join(__dirname, '.')));

// 1. MongoDB Atlas Connection (Render Environment Variable හෝ Fallback එක ලෙස)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://imeshkavinda550_db_user:GVvK8sRKWOVDsKV4@cluster0.w8vgaoy.mongodb.net/dedunu_fashion?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// 2. Mongoose Schemas & Models
const storeDataSchema = new mongoose.Schema({
  type: { type: String, required: true }, // උදාහරණයක් ලෙස: product, category ආදී වශයෙන්
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const StoreData = mongoose.model('StoreData', storeDataSchema);

// 3. Admin Authentication Middleware (x-admin-token පරීක්ෂා කිරීම සඳහා)
const verifyAdminToken = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  // ඔබේ ඇඩ්මින් ටෝකන් එක මෙහිදී පරීක්ෂා කෙරේ
  if (adminToken) {
    next();
  } else {
    // ටෝකන් එක නැත්නම් හෝ වැරදි නම් රික්වෙස්ට් එක බ්ලොක් කරයි
    res.status(401).json({ success: false, message: 'Unauthorized: Access denied' });
  }
};

// --- API Endpoints ---

// ඩේටා සේව් කිරීමට (Admin පැනලයෙන් එවෙන ඩේටා සඳහා)
app.post('/store-data', verifyAdminToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    const newData = new StoreData({ type, data });
    await newData.save();
    res.status(200).json({ success: true, message: 'Data saved to MongoDB successfully!' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ඩේටා ලබා ගැනීමට (Frontend එකට)
app.get('/get-data', async (req, res) => {
  try {
    const dataList = await StoreData.find({});
    res.status(200).json(dataList);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// හෝම් පේජ් රූට් එක
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ඇඩ්මින් පේජ් රූට් එක
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dedunu-secret-admin.html'));
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});