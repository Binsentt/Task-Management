import mongoose from 'mongoose';

const { Schema } = mongoose;

const remoteShiftSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    // optional: the task being worked on during this shift
    task: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    // stored in UTC, convert to the org timezone on the client
    time_in: {
        type: Date,
        required: true,
        default: Date.now
    },
    // null while the shift is still open
    time_out: {
        type: Date,
        default: null,
        validate: {
            validator: function (value) {
                return value === null || value === undefined || value > this.time_in;
            },
            message: 'time_out must be after time_in'
        }
    },
    note: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    // set when a manager or admin corrects the shift
    edited_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// A user can only have one open shift at a time (enforced by the database,
// so two simultaneous clock-ins can't both succeed)
remoteShiftSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { time_out: { $type: 'null' } } }
);

// Common query paths
remoteShiftSchema.index({ user: 1, time_in: -1 });
remoteShiftSchema.index({ organization: 1, time_in: -1 });

// true while the shift is running
remoteShiftSchema.virtual('is_open').get(function () {
    return this.time_out === null;
});

// duration in milliseconds, uses "now" if the shift is still open
remoteShiftSchema.virtual('duration_ms').get(function () {
    const end = this.time_out || new Date();
    return end - this.time_in;
});

remoteShiftSchema.set('toJSON', {
    virtuals: true, transform: (doc, ret) => {
        delete ret.id;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('RemoteShift', remoteShiftSchema);