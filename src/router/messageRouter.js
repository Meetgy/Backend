import { Router } from "express"
import { WebSocketServer } from "ws"
import { Message } from "../models/message.js"

const messageRouter = Router();

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
    console.log('Client connected to WS');

    ws.on('message', async (message, isBinary) => {

        const { sender_id, receiver_id, content } = JSON.parse(message);
        try {
            const newMessage = new Message({
                sender_id,
                receiver_id,
                content
            });

            await newMessage.save();

            wss.clients.forEach((client) =>  {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ event: 'messageSaved', message: newMessage }), { binary: isBinary });
                }
            });
            // In a real application, I need to have a mechanism to find and notify the receiver
            // Here, we are just logging for simplicity
            console.log(`Message from ${sender_id} to ${receiver_id}: ${content}`);

        } catch (error) {
            console.error('Error saving message:', error);
            ws.send(JSON.stringify({ event: 'error', message: 'Message could not be saved. Please try again.' }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

messageRouter.get('/chat', (req, res) => {
    res.send('WebSocket endpoint');
});

export {
    messageRouter,
    wss
};
