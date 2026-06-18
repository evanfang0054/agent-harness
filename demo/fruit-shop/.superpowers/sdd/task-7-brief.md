## Task 7: `auth.service` 注入 PinoLogger + 业务埋点

**Files:**
- Modify: `packages/server/src/modules/auth/auth.service.ts`

- [ ] **Step 1: 修改 import 与构造函数**

在文件顶部 import 区追加：
```ts
import { PinoLogger } from 'nestjs-pino';
```

构造函数追加 `private readonly logger: PinoLogger` 参数：
```ts
constructor(
  @InjectRepository(UserEntity)
  private readonly userRepo: Repository<UserEntity>,
  private readonly jwtService: JwtService,
  private readonly configService: ConfigService,
  @Inject('REDIS_CLIENT')
  private readonly redis: Redis,
  private readonly logger: PinoLogger,  // ← 新增
) {}
```

并在构造函数体内设置 context：
```ts
constructor(/* ...params..., */ private readonly logger: PinoLogger) {
  this.logger.setContext(AuthService.name);
}
```

- [ ] **Step 2: 在 `login` 成功分支埋点**

修改 `auth.service.ts` 中 `login` 方法，在 `const tokens = await this.generateTokens(...)` 之后、`return` 之前插入：

```ts
const tokens = await this.generateTokens(user.id, user.phone, user.role);

this.logger.info(
  {
    userId: user.id,
    phone: user.phone,
  },
  '用户登录成功',
);

// 返回时排除 password
const { password: _, ...userWithoutPassword } = user;
return { /* ...existing */ };
```

- [ ] **Step 3: 在 `generateTokens` 内埋点 JWT 签发（debug 级）**

修改 `generateTokens` 方法，在 `return { accessToken, refreshToken }` 之前插入：

```ts
this.logger.debug(
  {
    userId,
    accessJti,
    refreshJti,
  },
  'JWT 签发',
);

return { accessToken, refreshToken };
```

- [ ] **Step 4: 在 `logout` 黑名单写入成功后埋点**

修改 `logout` 方法中 `await this.redis.set(...)` 之后插入：

```ts
await this.redis.set(
  `token:blacklist:${jti}`,
  '1',
  'EX',
  ttl,
);

this.logger.info(
  {
    userId,
    jti,
    ttl,
  },
  'JWT 已加入黑名单（登出）',
);
```

- [ ] **Step 5: 在 `auth.module.ts` 确认 PinoLogger 可注入**

`nestjs-pino` 的 `LoggerModule` 已在 `LoggingModule` 中通过 `exports` 导出，但 `AuthModule` 需确保 `LoggingModule` 在 imports 中可见。由于 `LoggerModule.forRoot` 是全局注册（nestjs-pino v4 默认 global），无需在每个子模块显式 import。

验证：启动后若报 `Nest can't resolve dependencies of AuthService (?, +)`，则需在 `AuthModule.imports` 显式加入 `LoggingModule`。**先不加，遇错再加。**

- [ ] **Step 6: 编译验证**

Run:
```bash
cd packages/server && pnpm exec tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 7: 启动验证 D10（登录 + JWT 日志）**

终端 1：`pnpm --filter server dev`
终端 2（注册 + 登录）：
```bash
TOKEN=$(curl -sX POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000001","password":"Pass1234","nickname":"log_test"}' \
  | grep -o '\"accessToken\":\"[^\"]*\"' | cut -d'"' -f4)

curl -sX POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900000001","password":"Pass1234"}' >/dev/null
```
Expected（终端 1）：
- 出现 `INFO` 日志：`用户登录成功`，含 `userId / phone: "139****0001"`
- 出现 `DEBUG` 日志：`JWT 签发`，含 `accessJti / refreshJti`

终端 2（登出）：
```bash
curl -sX POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer $TOKEN" >/dev/null
```
Expected（终端 1）：
- 出现 `INFO` 日志：`JWT 已加入黑名单（登出）`，含 `userId / jti / ttl`

- [ ] **Step 8: 提交**

```bash
git add packages/server/src/modules/auth/auth.service.ts
git commit -m "feat(logging): auth.service 接入 PinoLogger（登录/JWT/登出）"
```

---

