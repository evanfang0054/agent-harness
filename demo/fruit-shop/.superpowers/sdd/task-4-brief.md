## Task 4: 编写 `logging.module.ts`

**Files:**
- Create: `packages/server/src/common/logging/logging.module.ts`

- [ ] **Step 1: 编写文件**

```ts
// packages/server/src/common/logging/logging.module.ts

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { buildPinoOptions } from './pino.config';

@Module({
  imports: [LoggerModule.forRoot(buildPinoOptions())],
  exports: [LoggerModule],
})
export class LoggingModule {}
```

- [ ] **Step 2: 在 AppModule 引入**

修改 `packages/server/src/app.module.ts`：

```ts
// 在 import 列表顶部加入（其他 import 之后）
import { LoggingModule } from './common/logging/logging.module';

// @Module.imports 数组首项加入 LoggingModule
imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: ['.env.local', '.env'],
  }),
  LoggingModule, // ← 新增，置于 TypeOrmModule 之前，确保启动期日志也走 pino
  TypeOrmModule.forRootAsync({ /* ...existing */ }),
  // ... 其余不变
],
```

- [ ] **Step 3: 编译验证**

Run:
```bash
cd packages/server && pnpm exec tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 4: 提交**

```bash
git add packages/server/src/common/logging/logging.module.ts packages/server/src/app.module.ts
git commit -m "feat(logging): 新增 LoggingModule 并接入 AppModule"
```

---

