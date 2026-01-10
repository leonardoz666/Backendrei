"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => (req, res, next) => {
    try {
        // If it's a GET request, validate query params?
        // For now, let's assume we validate body for POST/PUT
        schema.parse(req.body);
        next();
    }
    catch (error) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
    }
};
exports.validate = validate;
