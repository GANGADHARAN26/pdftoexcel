import mongoose from 'mongoose';

const ConversionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous conversions
  },
  sessionId: {
    type: String,
    required: true, // For tracking anonymous users
  },
  originalFileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  pagesProcessed: {
    type: Number,
    required: true,
  },
  processingTime: {
    type: Number, // in milliseconds
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'processing'],
    default: 'processing',
  },
  errorMessage: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
ConversionSchema.index({ userId: 1, createdAt: -1 });
ConversionSchema.index({ sessionId: 1, createdAt: -1 });
ConversionSchema.index({ createdAt: -1 });

export default mongoose.models.Conversion || mongoose.model('Conversion', ConversionSchema);