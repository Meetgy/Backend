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
},{
    timestamps: true,
});

const Message = model('Message', MessageSchema);

export {
    Message
}