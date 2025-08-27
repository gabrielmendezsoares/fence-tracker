import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import nodeSchedule from 'node-schedule';
import { createRequire } from 'module';
import { Prisma, PrismaClient } from '@prisma/client/storage/client.js';
import { expressiumRoute, loggerUtil, startServer, createServer } from '../expressium/index.js';
import { appRoute } from './routes/index.js';
import { fetchAlertMapListService } from './services/index.js';

const require = createRequire(import.meta.url);

const helmet = require('helmet');

const prisma = new PrismaClient();

const buildServer = async (): Promise<void> => {
  try {
    const app = express();

    app.use(cors());
    app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
    app.use(express.json());
    appRoute.buildRoutes();
    app.use('/api', expressiumRoute.router);

    app.use(
      (
        _req: Request, 
        res: Response
      ): void => {
        res
          .status(404)
          .json(
            {
              message: 'Route not found.',
              suggestion: 'Please check the URL and HTTP method to ensure they are correct.'
            }
          );
      }
    );

    const serverInstance = await createServer(app);
    
    await startServer(serverInstance as Express);
    
    await fetchAlertMapListService.fetchAlertMapList();

    nodeSchedule.scheduleJob('0 0 0 * * *', (): Promise<Prisma.BatchPayload> => prisma.fence_tracker_triggers.deleteMany());
    nodeSchedule.scheduleJob('0 0 12 * * *', (): Promise<Prisma.BatchPayload> => prisma.fence_tracker_triggers.deleteMany());
    nodeSchedule.scheduleJob('0 */1 * * * *', fetchAlertMapListService.fetchAlertMapList);
  } catch (error: unknown) {
    loggerUtil.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

buildServer();
