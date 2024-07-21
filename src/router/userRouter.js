import { Router } from "express";
import User from "../models/user.js";
import auth from "../middleware/auth.js";

const userRouter = new Router();

userRouter.post('/signup', async (req, res) => {
    if(!req.body.username.includes('@')) {
        req.body.username = `@${req.body.username}`
    }
    const user = new User(req.body);

    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.status(200).send({ user, token });
    } catch (error) {
        res.status(400).json(error)
    }
});

userRouter.post('/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body);
        const token = await user.generateAuthToken();
        res.status(200).send({ user, token });
    } catch (error) {
        res.status(400).json(error);
    }
});

userRouter.get('/connections', auth, async (req, res) => {
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