import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors({
  origin: 'http://localhost:3000',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ros-topics', (c) => {
  // This endpoint will be used to get available ROS topics
  // The actual connection is handled client-side via roslibjs
  return c.json({
    topics: [],
    message: 'ROS connection is handled client-side via rosbridge_websocket'
  });
});

const PORT = process.env.PORT || 4000;

console.log(`Server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
