import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import routes from './routes.js';
import {addLog} from '../logger.js';

export function startBridgeServer(port = 4000) {
    const app = express();
    app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
    app.use(bodyParser.text({ type: '*/*' }));
    app.use('/', routes);

    app.listen(port, () => {console.log(`Tally Bridge server running on http://localhost:${port}`); addLog(`Tally Bridge server running on http://localhost:${port}`);});
}

export default { startBridgeServer };
