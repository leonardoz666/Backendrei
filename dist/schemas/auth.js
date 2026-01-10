"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    login: zod_1.z.string().min(1, 'Login é obrigatório'),
    senha: zod_1.z.string().min(1, 'Senha é obrigatória')
});
