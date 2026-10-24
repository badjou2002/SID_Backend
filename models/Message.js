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
    role: {
      type: String,
      enum: ['user', 'assistant'],
      default: 'user'
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator(value) {
          return value == null || (Number.isInteger(value) && this.role === 'assistant');
        },
        message: 'Only assistant messages can have an integer rating from 1 to 5'
      }
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    topics: {
      type: [String],
      default: []
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
messageSchema.index({ sentAt: 1, conversation: 1 });

module.exports = mongoose.model('Message', messageSchema);
