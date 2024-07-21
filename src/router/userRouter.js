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
        res.status(400).json(error);
    }
});

userRouter.post('/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body);
        const token = await user.generateAuthToken();
        res.status(200).send({ user, token });
    } catch (error) {
        res.status(400).json({ Message: error.message });
    }
});

userRouter.post('/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((tokenObject) => {
            return tokenObject.token !== req.token;
        })
        await req.user.save();
        res.send();
    } catch (error) {
        res.status(500).json({ Message: error.message });
    }
});

userRouter.post('/logout_all', auth, async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body);
        user.tokens = user.tokens.filter((tokenObject) => {
            return tokenObject.token == req.token;
        })
        await user.save();
        res.status(200).send({ user:req.user, token:req.token })
    } catch (error) {
        res.status(400).json({ Message: error.message });
    }
});

userRouter.get('/connections', auth, async (req, res) => {
    const users = await User.find({});

    try {
        res.status(200).send(users)
    } catch (error) {
        res.status(400).json({ Message: error.message });
    }
});

export {
    userRouter
};