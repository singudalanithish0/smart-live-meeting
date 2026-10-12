import fs from "fs";
import path from "path";

const uploadDirectory = path.resolve(process.cwd(), "uploads");

export function ensureUploadDirectory() {
  if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
  }

  return uploadDirectory;
}

export function normalizeStoredFile(file) {
  if (!file) {
    return null;
  }

  return {
    fileName: file.originalname || file.fileName || "upload",
    mimeType: file.mimetype || file.mimeType || "application/octet-stream",
    size: file.size || 0,
    url: file.path || file.fileUrl || "",
    createdAt: new Date().toISOString()
  };
}

export function saveBufferFile(fileName, buffer, mimeType = "application/octet-stream") {
  ensureUploadDirectory();

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const finalPath = path.join(uploadDirectory, safeFileName);

  fs.writeFileSync(finalPath, buffer);

  return {
    fileName: safeFileName,
    mimeType,
    size: buffer.length,
    path: finalPath
  };
}

export default {
  ensureUploadDirectory,
  normalizeStoredFile,
  saveBufferFile
};
