import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique:true,
        minlength: 4,
        trim: true
    },
    email: {
        type:String,
        required: true,
        lowercase:true,
        unique:true
    },
    password: {
        type:String,
        required:true
    },
    createdAt: {
        type:Date,
        default: Date.now
    }
});

UserSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('password')) return next();

        const salt = bcrypt.genSalt(10);
        this.password = bcrypt.hash(this.password, salt);

        next();
 
    } catch (error) {
        next();

    }
});

module.exports = mongoose.model("User", UserSchema);