import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  provider: {
    type: String,
    default: 'google',
  },
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  subscriptionId: {
    type: String,
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due'],
    default: 'inactive',
  },
  subscriptionEndDate: {
    type: Date,
  },
  usageStats: {
    today: {
      count: { type: Number, default: 0 },
      date: { type: Date, default: Date.now },
    },
    thisMonth: {
      count: { type: Number, default: 0 },
      month: { type: Number, default: new Date().getMonth() },
      year: { type: Number, default: new Date().getFullYear() },
    },
    total: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

// Index for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ subscriptionStatus: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);