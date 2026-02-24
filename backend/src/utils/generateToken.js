import jwt from "jsonwebtoken";

const generateToken = (id, tokenVersion = 0) => {
    return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

export default generateToken;
