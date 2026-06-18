// packages/server/src/common/logging/logging.module.ts

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { buildPinoOptions } from './pino.config';

@Module({
  imports: [LoggerModule.forRoot(buildPinoOptions())],
  exports: [LoggerModule],
})
export class LoggingModule {}
