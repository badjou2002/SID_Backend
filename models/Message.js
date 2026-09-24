const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required']
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: 'sentAt', updatedAt: 'updatedAt' }
  }
);

messageSchema.index({ conversation: 1, sentAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
