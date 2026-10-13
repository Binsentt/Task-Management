import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const { Schema } = mongoose;

export const PASSWORD_SALT_ROUNDS = 12;

const userSchema = new Schema({
    full_name: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 100,
        match: [/^(?:\p{L}\p{M}*)+(?: (?:\p{L}\p{M}*)+)*$/u, 'Full name can only contain letters and spaces']
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 4,
        maxlength: 30,
        match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, _ . -']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
    },
    contact_number: {
        type: String,
        minlength: 1,
        maxlength: 20,
        match: [/^[0-9]+$/, 'Contact number can only contain digits']
    },
    // stored as a bcrypt hash, never returned unless asked: User.findOne().select('+password')
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    // null = individual (no organization)
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    // org-scoped role, only set when the user belongs to an organization
    org_role: {
        type: String,
        enum: ['MEMBER', 'MANAGER', 'ADMIN', null],
        default: null
    },
    // platform-level flag, for the app owner only
    system_role: {
        type: String,
        enum: ['USER', 'SUPERADMIN'],
        default: 'USER'
    },
    joined_org_at: {
        type: Date,
        default: null
    },
    auth_version: {
        type: Number,
        default: 0,
        min: 0
    },
    password_reset_token_hash: {
        type: String,
        select: false
    },
    password_reset_expires_at: {
        type: Date,
        select: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// organization and org_role must be set together
userSchema.pre('validate', function () {
    if (this.organization && !this.org_role) {
        this.invalidate('org_role', 'org_role is required when the user belongs to an organization');
    }
    if (!this.organization && this.org_role) {
        this.invalidate('org_role', 'org_role must be empty when the user has no organization');
    }
});

// hash the password only when it changed
// Mongoose 9: hooks are plain async functions, a thrown error fails the save
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, PASSWORD_SALT_ROUNDS);
});

// usage: const user = await User.findOne({ email }).select('+password'); await user.comparePassword(input)
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

// never leak the hash or internals in API responses
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.password_reset_token_hash;
        delete ret.password_reset_expires_at;
        delete ret.__v;
        return ret;
    }
});

export default mongoose.model('User', userSchema);