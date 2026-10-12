import mongoose from 'mongoose';

const { Schema } = mongoose;

const presenceSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    last_seen_at: { type: Date, required: true },
    status: { type: String, enum: ['ONLINE', 'OFFLINE'], default: 'OFFLINE' }
}, { timestamps: true });

presenceSchema.index({ organization: 1, last_seen_at: -1 });

const pingSchema = new Schema({
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sent_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true },
    responded_at: { type: Date, default: null },
    status: { type: String, enum: ['PENDING', 'RESPONDED', 'NO_RESPONSE', 'EXPIRED'], default: 'PENDING' }
}, { timestamps: true });

pingSchema.index({ organization: 1, status: 1, expires_at: 1 });

export const PresencePing = mongoose.model('PresencePing', pingSchema);
export default mongoose.model('Presence', presenceSchema);