import mongoose from "mongoose";
import { Router } from "express"
import { WebSocketServer } from "ws"
import Message from "../models/message.js"
import auth from "../middleware/auth.js";
import User from "../models/user.js";

const messageRouter = Router();

const wss = new WebSocketServer({ noServer: true });

const clientsMap = new Map();

wss.on('connection', async (ws, request) => {
    console.log('Client connected to WS');

    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    // acessig the Params
    ws.userId = parsedUrl.searchParams.get('userId');

    if (ws.userId) {
        clientsMap.set(ws.userId, ws);
        await User.findByIdAndUpdate(ws.userId, { status: "online" })

        console.log(`User ${ws.userId} connected`)
        console.log(clientsMap.size);

        try {
            if (!mongoose.Types.ObjectId.isValid(ws.userId)) {
                // Handle the case where receiver_id is invalid
                throw new Error("Invalid receiver ID");
            }
            // Fetch and send pending messages
            const pendingMsgs = await Message.find({
                receiver_id: ws.userId,
                state: "sent"
            });
            const receiverWs = clientsMap.get(pendingMsgs[0]?.receiver_id.toString())
            // const senderWs = clientsMap.get(pendingMsgs[0]?.sender_id.toString())
            if (pendingMsgs && receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                pendingMsgs.forEach(async (pendingMsg) => {
                    pendingMsg.state = 'delivered'
                    receiverWs.send(JSON.stringify({ event: 'pendingMessageReceived', message: pendingMsg }))
                    // senderWs.send(JSON.stringify({ event: 'pendingMessageReached', message: pendingMsg }))
                    await pendingMsg.save();
                    console.log(pendingMsg);
                });
            }
        } catch (error) {
            console.error('Error fetching pending messages:', error);
        }

        ws.on('message', async (message) => {

            const { sender_id, receiver_id, content, state } = JSON.parse(message);
            try {

                const senderWs = clientsMap.get(sender_id)
                const receiverWs = clientsMap.get(receiver_id)
                let newMessage = new Message({
                    sender_id,
                    receiver_id,
                    content,
                    state
                });

                // add Redis Queue logic ///////////////////////////////////

                if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                    newMessage.state = 'delivered'
                    await newMessage.save();
                    // console.log(newMessage == undefined);
                    receiverWs.send(JSON.stringify({ event: 'messageReceived', message: newMessage }));
                    senderWs.send(JSON.stringify({ event: 'messageReached', message: newMessage }));
                } else if (!receiverWs) {
                    await newMessage.save();
                    senderWs.send(JSON.stringify({ event: 'messagePending', message: newMessage }));
                }

                console.log(`Message from ${sender_id} to ${receiver_id}: ${content} is ${newMessage.state}`);
                // ROOM LOGIC
                // wss.clients.forEach((client) => {
                //     if (client.readyState === WebSocket.OPEN) {
                //         client.send(JSON.stringify({ event: 'messageSaved', message: newMessage }));
                //     }
                // });

                // In a real application, I need to have a mechanism to find and notify the receiver
                // Here, we are just logging for simplicity

            } catch (error) {
                console.error('Error handling message:', error);
                ws.send(JSON.stringify({ event: 'error', message: 'Message could not be saved. Please try again.' }));
            }
        });
        ws.on('close', async () => {
            console.log('Client disconnected');
            await User.findByIdAndUpdate(ws.userId, { status: "offline" })
            clientsMap.delete(ws.userId);
            console.log(clientsMap.size);
        });
    } else {
        console.log(clientsMap.size);
        console.error('Connection attempt without userId');
        ws.close();
    }
});

messageRouter.get('/all', auth, async (req, res) => {
    try {
        const messages = await Message.find({ $or: [{ sender_id: req.user._id }, { receiver_id: req.user._id }] })
        res.send(messages);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

messageRouter.patch('/msg/dlt/:id', auth, async (req, res) => {
    try {
        // await Message.findOneAndDelete(req.params.id)
        const msg = await Message.find({ _id: req.params.id });
        msg.receiver_id = undefined;
        if (msg.ud_contains == false) {
            await Message.findByIdAndDelete(req.params.id);
            res.send({ message: "Message has been deleted permanently Successfully" });
        }
        await msg.save();
        res.send({ message: "Message has been deleted Successfully" });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

messageRouter.delete('/msg/empty_dlt/:id', auth, async (req, res) => {
    try {
        const msg = await Message.find({ _id: req.params.id });
        if (msg.ud_contains == false) {
            await Message.findByIdAndDelete(req.params.id);
            res.send({ message: "Message has been deleted permanently Successfully" });
            return;
        }
        res.send({ message: "No Message found" });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

messageRouter.patch('/msg/dlt_from_me/:id', auth, async (req, res) => {
    try {
        const msg = await Message.findOne({ _id: req.params.id })
        msg.sender_id = undefined;
        if (msg.sender_id == undefined && msg.receiver_id == undefined) {
            msg.ud_contains = false;
        }
        await msg.save();

        res.send({ message: "Message has been deleted for me Successfully" });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

export {
    messageRouter,
    wss
};