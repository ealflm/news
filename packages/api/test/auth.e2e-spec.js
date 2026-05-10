"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_module_1 = require("../src/app.module");
const db_1 = require("@news/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
let app;
const testEmail = 'e2e-auth@local.test';
const testPassword = 'Password123!';
(0, vitest_1.beforeAll)(async () => {
    await db_1.prisma.user.deleteMany({ where: { email: testEmail } });
    await db_1.prisma.user.create({
        data: {
            email: testEmail,
            displayName: 'E2E',
            passwordHash: await bcrypt_1.default.hash(testPassword, 10),
        },
    });
    const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('api');
    await app.init();
});
(0, vitest_1.afterAll)(async () => {
    await app?.close();
    await db_1.prisma.user.deleteMany({ where: { email: testEmail } });
    await db_1.prisma.$disconnect();
});
(0, vitest_1.describe)('POST /api/auth/login', () => {
    (0, vitest_1.it)('returns 200 with cookies on valid creds', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.user.email).toBe(testEmail);
        const cookies = res.headers['set-cookie'];
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
    });
    (0, vitest_1.it)('returns 401 on wrong password', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: testEmail, password: 'wrong-password' });
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('returns 400 on invalid payload', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: 'bad', password: 'x' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)('GET /api/auth/me', () => {
    (0, vitest_1.it)('returns 401 without cookie', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer()).get('/api/auth/me');
        (0, vitest_1.expect)(res.status).toBe(401);
    });
    (0, vitest_1.it)('returns user with valid cookie', async () => {
        const login = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        const cookie = login.headers['set-cookie'].find((c) => c.startsWith('access_token='));
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .get('/api/auth/me')
            .set('Cookie', cookie);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.email).toBe(testEmail);
    });
});
(0, vitest_1.describe)('POST /api/auth/refresh', () => {
    (0, vitest_1.it)('issues new access token from refresh cookie', async () => {
        const login = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });
        const refreshCookie = login.headers['set-cookie'].find((c) => c.startsWith('refresh_token='));
        const res = await (0, supertest_1.default)(app.getHttpServer())
            .post('/api/auth/refresh')
            .set('Cookie', refreshCookie);
        (0, vitest_1.expect)(res.status).toBe(200);
        const cookies = res.headers['set-cookie'];
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    });
});
(0, vitest_1.describe)('POST /api/auth/logout', () => {
    (0, vitest_1.it)('clears cookies', async () => {
        const res = await (0, supertest_1.default)(app.getHttpServer()).post('/api/auth/logout');
        (0, vitest_1.expect)(res.status).toBe(204);
        const cookies = res.headers['set-cookie'];
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith('access_token=;'))).toBe(true);
        (0, vitest_1.expect)(cookies.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
    });
});
//# sourceMappingURL=auth.e2e-spec.js.map