"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const auth_1 = require("../lib/auth");
function authenticate(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const session = (0, auth_1.verifyToken)(token);
    if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    req.user = session;
    next();
}
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        if (req.user.role === 'ADMIN') {
            next();
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        next();
    };
}
