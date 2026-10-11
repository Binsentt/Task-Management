import mongoose from 'mongoose';
const { Schema } = mongoose;

const checklistItemSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    isDone: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    }
});

const taskSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 120
    },
    content: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: ''
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    assigned_to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    // null = personal task, set = organization task
    organization: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    status: {
        type: String,
        enum: ['TO_DO', 'IN_PROGRESS', 'DONE'],
        default: 'TO_DO'
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'MEDIUM'
    },
    deadline: {
        type: Date,
        default: null
    },
    completed_at: {
        type: Date,
        default: null
    },
    checklist: {
        type: [checklistItemSchema],
        default: [],
        validate: {
            validator: (items) => items.length <= 100,
            message: 'A task can have at most 100 checklist items'
        }
    },
    // soft delete: keeps history entries pointing at a real task
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Only org tasks can be assigned to someone
taskSchema.pre('validate', function () {
    if (this.assigned_to && !this.organization) {
        this.invalidate('assigned_to', 'Personal tasks cannot be assigned to another user');
    }
});

// Keep completed_at in sync with status
taskSchema.pre('save', function () {
    if (this.isModified('status')) {
        if (this.status === 'DONE') {
            this.completed_at = this.completed_at || new Date();
        } else {
            this.completed_at = null;
        }
    }
});

// Common query paths
taskSchema.index({ organization: 1, status: 1 });
taskSchema.index({ created_by: 1, organization: 1 });
taskSchema.index({ organization: 1, deadline: 1 });

// Hide soft-deleted tasks by default: Task.find().notDeleted()
taskSchema.query.notDeleted = function () {
    return this.where({ deleted_at: null });
};

export default mongoose.model('Task', taskSchema);