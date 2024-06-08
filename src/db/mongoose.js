import mongoose from "mongoose";

mongoose.connect("mongodb://127.0.0.1:27017/lets-chat")
.then(() => {
    console.log('Mongoose Connected');
})
.catch((err) => {
    console.log('Mongoose Connection Error' + err);
})

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

export default mongoose;