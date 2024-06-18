import { Router } from "express"
import { WebSocketServer } from "ws"
import { Message } from "../models/message.js"

const messageRouter = Router();

const wss = new WebSocketServer({ noServer: true });

const clientsMap = new Map();

wss.on('connection', (ws, request) => {
    console.log('Client connected to WS');
    
    console.log(clientsMap.size);
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    ws.userId = parsedUrl.searchParams.get('userId');
    
    if (ws.userId) {
        clientsMap.set(ws.userId, ws);
        console.log(`User ${ws.userId} connected`)
        console.log(clientsMap.size);

        ws.on('message', async (message, isBinary) => {

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
                    newMessage.state = 'sent'
                    await newMessage.save();
                    receiverWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }), { binary: isBinary });
                    senderWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }), { binary: isBinary });
                } else if (!receiverWs) {
                    await newMessage.save();
                    senderWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }), { binary: isBinary });
                }

                console.log(`Message from ${sender_id} to ${receiver_id}: ${content} is pending`);
                // ROOM LOGIC
                // wss.clients.forEach((client) => {
                //     if (client.readyState === WebSocket.OPEN) {
                //         client.send(JSON.stringify({ event: 'messageSaved', message: newMessage }), { binary: isBinary });
                //     }
                // });

                // In a real application, I need to have a mechanism to find and notify the receiver
                // Here, we are just logging for simplicity

            } catch (error) {
                console.error('Error handling message:', error);
                ws.send(JSON.stringify({ event: 'error', message: 'Message could not be saved. Please try again.' }));
            }
        });
        ws.on('close', () => {
            console.log('Client disconnected');
            clientsMap.delete(ws.userId);
            console.log(clientsMap.size);
        });
    } else {
        console.log(clientsMap.size);
        console.error('Connection attempt without userId');
        ws.close();
    }
});

messageRouter.get('/chat', (req, res) => {
    res.send('WebSocket endpoint');
});

export {
    messageRouter,
    wss
};
