const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

const MAX_SIZE        = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
const ALLOWED_MIMES   = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXTS    = ['.pdf', '.docx'];
const UPLOAD_PATH     = process.env.UPLOAD_PATH || 'uploads';

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter — validate mime + extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error('Only PDF and DOCX files are allowed'), false);
  }
  if (!ALLOWED_EXTS.includes(ext)) {
    return cb(new Error('Only .pdf and .docx extensions are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

module.exports = upload;