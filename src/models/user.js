import mongoose, { Types, model } from "mongoose";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: [true, 'Username is required'],
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
        required: [true, 'Email is required'],
        unique:true,
        trim:true,
        validate: {
            validator: (value) => {
                // Validating Email using Regex
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            },
            message: 'Email is invalid'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        trim:true,
        minlength:[8, 'Password must be at least 8 characters long'],
        validate: {
            validator: (value) => !value.toLowerCase().includes("password"),
            message: 'Password is invalid.'
        }
    },
    profile_picture: {
        type:Buffer
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
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

UserSchema.methods.toJSON = function () {
    const user = this;

    const userObject = user.toObject();

    delete userObject.password;
    return userObject;
}

const User = model('User', UserSchema);

export {
    User
};