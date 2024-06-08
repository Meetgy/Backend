import express, { json } from 'express';
import cors from 'cors'
import { createServer } from 'http';
import "./db/mongoose.js"
import { userRouter } from './router/userRouter.js';
import { messageRouter, wss } from './router/messageRouter.js';

const app = express();
const port = 8000;

app.use(cors({
  origin:true
}))

app.use(json());
app.use('/user', userRouter);
app.use('/chat', messageRouter);

// Initialize a simple HTTP server
const server = createServer(app);

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
    if (request.url === '/chat') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });   
    } else {
        console.log("not '/chat' path");
    }
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});