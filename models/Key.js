const mongoose = require('mongoose');

// สร้าง schema สำหรับคีย์
const keySchema = new mongoose.Schema({
    userId: String,
    key: String,
    generatedAt: { type: Date, default: Date.now }, // ค่าเริ่มต้นเป็นเวลาปัจจุบัน
    expiryDate: { type: Date, required: true }, // วันหมดอายุ
});

// สร้างโมเดลสำหรับคีย์
const Key = mongoose.model('Key', keySchema);

module.exports = Key; // ส่งออกโมเดล
