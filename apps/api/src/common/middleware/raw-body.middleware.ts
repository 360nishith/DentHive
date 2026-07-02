import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 100KB Guillotine to prevent CPU Exhaustion
    bodyParser.raw({ 
      type: 'application/json', 
      limit: '100kb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    })(req, res, next);
  }
}
