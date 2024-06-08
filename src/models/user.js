import mongoose, { Types, model } from "mongoose";
import validator from "validator";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        trim:true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
        trim:true,
    },
    email: {
        type: String,
        lowercase: true,
        required: true,
        unique:true,
        trim:true,
        validate: {
            validator: (value) => validator.isEmail(value),
            message: 'Email is invalid.'
        }
    },
    password: {
        type: String,
        required: true,
        trim:true,
        minlength: 7,
        validate: {
            validator: (value) => !value.toLowerCase().includes("password"),
            message: 'Email is invalid.'
        }
    },
    profile_picture: {
        type:Buffer
    },
    status: {
        type: String,
        required: true,
        enum: ['offline', 'online'],
        default: 'offline',
    },
    connections: [{
        type: Types.ObjectId,
        ref: 'User'
    }],
},{
    timestamps: true,
});

const User = model('User', UserSchema);

export {
    User
};