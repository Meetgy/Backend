import mongoose, { Types, model } from "mongoose";

const MessageSchema = new mongoose.Schema({
    content: {
        type: String,
        trim:true,
        required: [true, 'Content is required'],
    },
    sender_id: {
        type: Types.ObjectId,
        ref: 'User',
        required: [true, 'sender_id is required'],
    },
    receiver_id: {
        type: Types.ObjectId,
        ref: 'User',
        required: [true, 'receiver_id is required'],
    },
    state: {
        type: String,
        required: [true, 'state is required'],
        enum: ['pending', 'sent'],
        default: 'pending',
    }
},{
    timestamps: true,
});

const Message = model('Message', MessageSchema);

export default Message;