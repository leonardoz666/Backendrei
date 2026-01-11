"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const orders_1 = __importDefault(require("./routes/orders"));
const kitchen_1 = __importDefault(require("./routes/kitchen"));
const tables_1 = __importDefault(require("./routes/tables"));
const printers_1 = __importDefault(require("./routes/printers"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get('/', (req, res) => {
    res.json({ message: 'API Rei do Pirão is running', timestamp: new Date() });
});
app.use('/auth', auth_1.default);
app.use('/users', users_1.default);
app.use('/products', products_1.default);
app.use('/categories', categories_1.default);
app.use('/orders', orders_1.default);
app.use('/kitchen', kitchen_1.default);
app.use('/tables', tables_1.default);
app.use('/printers', printers_1.default);
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
