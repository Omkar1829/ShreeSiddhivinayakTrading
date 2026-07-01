const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('WARNING: Cloudinary is not configured. File uploads will fall back to mock image URLs.');
}

/**
 * Uploads a file buffer to Cloudinary or returns a placeholder fallback if credentials are missing.
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} folder - Destination folder on Cloudinary.
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadImage = (fileBuffer, folder = 'siddhivinayak') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      // Fallback: return a mock image URL
      return resolve({
        secure_url: `https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600`,
        public_id: `mock_${Date.now()}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(error);
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    // Pipe the multer file buffer stream into the Cloudinary upload stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);
    stream.pipe(uploadStream);
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  isCloudinaryConfigured
};
