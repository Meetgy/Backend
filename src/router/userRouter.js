import { Router } from "express";
import User from "../models/user.js";

const userRouter = new Router();

userRouter.post('/signup', async (req, res) => {
    const user = new User(req.body);

    try {
        await user.save();
        res.status(200).send(user)
    } catch (error) {
        res.status(400).json(error)
    }
});

userRouter.get('/', async (req, res) => {
    const users = await User.find({});

    try {
        res.status(200).send(users)
    } catch (error) {
        res.status(400).send(error)
    }
});

export {
    userRouter
};