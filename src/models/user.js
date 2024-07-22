import mongoose, { Types, model } from "mongoose";
import uniqueValidator from 'mongoose-unique-validator'
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Message from "./message.js";

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: [true, 'Username is required'],
        trim: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        lowercase: true,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
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
        trim: true,
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            validator: (value) => !value.toLowerCase().includes("password"),
            message: 'Password cannot contain the word "password".'
        }
    },
    profile_picture: {
        type: Buffer
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
    tokens: [{
        token: {
            type: String,
            required: [true, 'please Authenticate']
        }
    }]
}, {
    timestamps: true,
});

UserSchema.plugin(uniqueValidator, { message: '{PATH} is already taken. Please try another one.' });

UserSchema.methods.toJSON = function () {
    const user = this;

    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.tokens;

    return userObject;
}

UserSchema.methods.generateAuthToken = async function () {
    const user = this;

    const token = jwt.sign(
        {
            username: user.username,
            email: user.email,
            _id: user._id.toString(),
        },
        "This is a temporary Private Key"
    );

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
}
UserSchema.statics.findByCredentials = async (body) => {
    const { username , email, password } = body;
    let user;

    const uniqueCredential = username ? { username } : { email }
    if(uniqueCredential) {
        user = await User.findOne(uniqueCredential)
    }

    if (!user) {
        throw new Error('Please provide a valid Username or Email');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch) {
        throw new Error('Wrong Password');
    }
    
    return user;
}

UserSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }

    next();
})

UserSchema.pre('findOneAndDelete', async function (next) {
    const _id = this.getQuery()["_id"];
    try {
        await Message.deleteMany({ $or: [ {sender_id: _id}, {receiver_id: _id} ] });
        next();
    } catch (error) {
        next(error);
    }
})

const User = model('User', UserSchema);

export default User;