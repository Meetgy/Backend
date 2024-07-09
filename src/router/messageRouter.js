import { Router } from "express"
import { WebSocketServer } from "ws"
import { Message } from "../models/message.js"

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

        console.log(`User ${ws.userId} connected`)
        console.log(clientsMap.size);

        // Logic to send Pending Msgs
        const pendingMsgs = await Message.find({
            receiver_id: ws.userId,
            state: "pending"
        });
        const receiverWs = clientsMap.get(pendingMsgs[0]?.receiver_id.toString())
        if (pendingMsgs && receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            pendingMsgs.forEach(pendingMsg => {
                receiverWs.send(JSON.stringify({ event: 'messageSaved', message: pendingMsg }))
            });
        }
        console.log(pendingMsgs);

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
                    // console.log(newMessage == undefined);
                    receiverWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }));
                    senderWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }));
                } else if (!receiverWs) {
                    await newMessage.save();
                    senderWs.send(JSON.stringify({ event: 'messageSaved', message: newMessage }));
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
