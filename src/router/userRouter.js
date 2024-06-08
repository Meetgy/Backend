import { Router } from "express";
import { User } from "../models/user.js";

const userRouter = new Router();

userRouter.post('/signup', async(req, res) => {
    const user = new User(req.body);

    try {
        await user.save();
        res.status(200).send(user)
    } catch (err) {
        res.status(400).send(err)
    }
});

export {
    userRouter
};