import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 3,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    created_by: {
        type: Schema.Types.ObjectId, ref: 'User'
    },
    status: {
        type: String,
        enum: ['TO_DO', 'IN_PROGRESS', 'DONE']
    },
    completed_at: {
        type: Date
    }
});


module.exports = mongoose.model('Task', taskSchema)