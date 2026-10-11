import mongoose from 'mongoose';

const { Schema } = mongoose;

export const HISTORY_ACTIONS = [
    'CREATED',
    'UPDATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'CHECKLIST_TOGGLED',
    'DELETED',
    'RESTORED'
];

// Append-only audit log. Every field is immutable so entries can't be edited after creation.
const historySchema = new Schema({
    task: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        immutable: true
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        immutable: true
    },
    // who made the change
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    action: {
        type: String,
        enum: HISTORY_ACTIONS,
        required: true,
        immutable: true
    },
    // { field: { from, to } }
    changes: {
        type: Schema.Types.Mixed,
        default: {},
        immutable: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true
    }
}, {
    versionKey: false
});

historySchema.index({ organization: 1, timestamp: -1 });
historySchema.index({ task: 1, timestamp: -1 });

// Block updates and deletes made through query helpers
const blocked = function () {
    throw new Error('History entries are append-only');
};
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany']
    .forEach((op) => historySchema.pre(op, blocked));

export default mongoose.model('History', historySchema);