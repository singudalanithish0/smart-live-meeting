import multer from "multer";
import path from "path";

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".webm"
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/webm"
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = file.mimetype || "";

  if (ALLOWED_EXTENSIONS.has(extension) || ALLOWED_MIME_TYPES.has(mimeType)) {
    return callback(null, true);
  }

  return callback(new Error("Unsupported file type"));
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter
});

export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 5);

export default upload;
