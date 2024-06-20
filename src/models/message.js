import mongoose, { Types, model } from "mongoose";

const MessageSchema = new mongoose.Schema({
    content: {
        type: String,
        trim:true,
        required:true,
    },
    sender_id: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver_id: {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
    },
    state: {
        type: String,
        required: true,
        enum: ['pending', 'sent'],
        default: 'pending',
    }
},{
    timestamps: true,
});

const Message = model('Message', MessageSchema);

export {
    Message
}