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
        enum: ['all', 'student', 'parent', 'teacher'],
        default: 'all',
    },
    expiresAt: {
        type: Date,
        default: null, // null = never expires
    },
    readBy: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Announcement", announcementSchema);
