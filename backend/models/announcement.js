const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    targetAudience: {
        type: String,
        enum: ['all', 'student', 'parent', 'teacher', 'admin'],
        default: 'all',
    },
    isAlert: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        default: null, 
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Announcement", announcementSchema);
