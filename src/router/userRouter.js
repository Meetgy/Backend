import { Router } from "express";
import User from "../models/user.js";
import auth from "../middleware/auth.js";
import { check, validationResult } from "express-validator";
import multer from "multer";

const userRouter = new Router();

userRouter.post('/signup', async (req, res) => {
    if (!req.body.username.includes('@')) {
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
        res.status(400).json({ message: error.message });
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
        res.status(500).json({ message: error.message });
    }
});

userRouter.post('/logout_all', auth, async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body);
        user.tokens = user.tokens.filter((tokenObject) => {
            return tokenObject.token == req.token;
        })
        await user.save();
        res.status(200).send({ user: req.user, token: req.token })
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

userRouter.delete('/remove_account', auth, async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body);
        await User.findOneAndDelete(user._id);
        res.send({ message: "Account has been deleted Successfully" })
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

userRouter.patch('/edit', auth,
    [
        check('username').optional().isLength({ min: 1 }).withMessage('Username must be at least 1 characters long'),
        check('name').optional().isLength({ min: 1 }).withMessage('Name is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const updates = Object.keys(req.body);
        const allowedEdits = ['username', 'name'];
        const isValidOperation = updates.every((update) => allowedEdits.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: 'Invalid updates!' })
        }
        if (updates.includes('username')) {
            if (!req.body.username.includes('@')) {
                req.body.username = `@${req.body.username}`
            }
        }
        try {
            req.user.tokens = req.user.tokens.filter((tokenObject) => {
                return tokenObject.token !== req.token;
            })

            updates.forEach((update) => req.user[update] = req.body[update])
            await req.user.save()

            const token = await req.user.generateAuthToken();

            res.send({ user: req.user, token })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    });

userRouter.patch('/edit/email', auth,
    [
        check('newEmail').isEmail().withMessage('New Email is invalid'),
        check('oldEmail').isEmail().withMessage('Old Email is invalid'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ]
    , async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findByCredentials({
                email: req.body.oldEmail,
                password: req.body.password
            });

            user.tokens = user.tokens.filter((tokenObject) => {
                return tokenObject.token !== req.token;
            })
            user.email = req.body.newEmail
            await user.save()

            const token = await user.generateAuthToken();

            res.send({ user, token })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    });

userRouter.patch('/edit/password', auth,
    [
        check('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ]
    , async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const isMatch = await User.comparePassword(req.body.password, req.user.password);
            if (!isMatch) {
                throw new Error('The password you entered is incorrect. Please try again.');
            }

            req.user.password = req.body.newPassword;
            await req.user.save()

            res.send({ user: req.user, token: req.token });
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    });


const storage = multer.memoryStorage(); // Store files in memory

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1000000 // 1MB file size limit
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpeg|png|jpg)$/)) {
            return cb(new Error('Please upload an image'));
        }
        cb(null, true);
    }
});

userRouter.post('/profile_picture', auth, upload.single('file'), async (req, res) => {
    try {
        const buffer = req.file.buffer;
        req.user.profile_picture = buffer;
        req.user.profile_picture_mime = req.file.mimetype;
        await req.user.save();

        res.send({ message: "Upload Successful" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

userRouter.get('/profile_picture', auth, async (req, res) => {
    try {
        if (!req.user || !req.user.profile_picture) {
            throw new Error('No profile picture found');
        }

        res.set('Content-Type', req.user.profile_picture_mime);
        res.send(req.user.profile_picture);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

userRouter.delete('/profile_picture', auth, async (req, res) => {
    try {
        req.user.profile_picture = undefined;
        await req.user.save();
        res.send({ message: "Remove Successful" });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

userRouter.get('/connections', auth, async (req, res) => {
    const users = await User.find({});

    try {
        res.status(200).send(users)
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export {
    userRouter
};