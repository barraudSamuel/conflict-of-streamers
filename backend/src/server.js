import Fastify from 'fastify'
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import websocket from '@fastify/websocket';
import gameRoutes from '../routes/game.js';
import { setupWebSocket } from '../websocket/socketHandler.js';

dotenv.config();

const fastify = Fastify({
    logger: true
})

await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
});

await fastify.register(websocket);

// Register game routes
await fastify.register(gameRoutes, { prefix: '/api/game' });

fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, setupWebSocket);
});


const start = async () => {
    try {
        const port = process.env.PORT || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Server running on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
