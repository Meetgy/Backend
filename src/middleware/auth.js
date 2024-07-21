import jwt from "jsonwebtoken";
import User from "../models/user.js";

const auth = async (req, res, next) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "");

        if (!token) {
            throw new Error();
        }
        
        const decoded = jwt.verify(token, "This is a temporary Private Key");
        const user = await User.findOne({username: decoded.username, _id: decoded._id, 'tokens.token': token});
        if(!user) {
            throw new Error();
        }
        req.token = token;
        req.user = user;
        next()
    } catch (error) {
        res.status(401).send({ error: 'Please Authenticate' })
    }
}

export default auth;