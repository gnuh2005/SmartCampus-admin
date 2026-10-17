const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✖ Thiếu biến môi trường MONGODB_URI. Hãy tạo file .env từ .env.example');
    process.exit(1);
  }
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`✔ MongoDB đã kết nối: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('✖ Không thể kết nối MongoDB Atlas:', err.message);
    process.exit(1);
  }
};
