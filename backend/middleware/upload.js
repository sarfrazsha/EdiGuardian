const multer = require('multer');
const path = require('path');

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/images');
    } else if (file.mimetype.startsWith('video/')) {
      cb(null, 'uploads/videos');
    } else {
      cb(null, 'uploads/docs'); // PDFs + Word
    }
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  if (file.mimetype.startsWith('video/')) return cb(null, true);
  if (file.mimetype === 'application/pdf') return cb(null, true);
  if (
    file.mimetype === 'application/msword' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return cb(null, true);

  cb(new Error('Only images, videos, and documents are allowed!'), false);
};

// Multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
});

module.exports = upload;