import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const organizationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 60
    },
    // the founding admin, used for ownership transfer rules
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // members join with this code, rotate it to invalidate old invites
    invite_code: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true,
        default: generateInviteCode
    },
    settings: {
        // IANA timezone, used to display shift and deadline times
        timezone: {
            type: String,
            default: 'UTC',
            trim: true
        },
        // shifts left open longer than this can be flagged or auto-closed
        max_shift_hours: {
            type: Number,
            default: 12,
            min: 1,
            max: 24
        }
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// replace the invite code, call save() afterwards
organizationSchema.methods.rotateInviteCode = function () {
    this.invite_code = generateInviteCode();
    return this.invite_code;
};

organizationSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('Organization', organizationSchema);