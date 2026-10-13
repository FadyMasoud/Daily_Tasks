const path = require('path');
const fs = require('fs');

// Post images go to Vercel Blob when a Blob token is set (Vercel's disk is
// temporary), otherwise to server/uploads/posts for local development.
// Vercel may add a custom prefix when connecting a store (e.g. MYSTORE_READ_WRITE_TOKEN),
// so accept any *_READ_WRITE_TOKEN that holds a Blob token.
const blobToken = process.env.BLOB_READ_WRITE_TOKEN || Object.entries(process.env)
  .find(([key, value]) => key.endsWith('READ_WRITE_TOKEN') && value?.startsWith('vercel_blob_'))?.[1];
// Newer Vercel stores connect with BLOB_STORE_ID instead of a token; @vercel/blob then
// authenticates with the deployment's OIDC identity automatically.
const useBlob = !!(blobToken || process.env.BLOB_STORE_ID);
const uploadDir = path.join(__dirname, '../uploads/posts');

// Saves a multer memory file and returns the value to store in posts.image_path.
async function saveImage(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const name = `post-${Date.now()}${ext}`;

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const blob = await put(`posts/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      token: blobToken,
    });
    return blob.url;
  }

  // Vercel's filesystem is read-only — without Blob there is nowhere to put the file.
  if (process.env.VERCEL)
    throw new Error('Image storage is not configured: connect a Vercel Blob store (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN) and redeploy');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, name), file.buffer);
  return `/uploads/posts/${name}`;
}

// Removes an image previously returned by saveImage. Never throws.
async function deleteImage(imagePath) {
  if (!imagePath) return;
  try {
    if (/^https?:\/\//.test(imagePath)) {
      const { del } = require('@vercel/blob');
      await del(imagePath, { token: blobToken });
    } else {
      const file = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  } catch (err) {
    console.error('Image delete failed:', err.message);
  }
}

module.exports = { saveImage, deleteImage };
