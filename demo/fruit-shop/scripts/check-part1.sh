#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass=0
fail=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)) || true; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((fail++)) || true; }
log_info()  { echo -e "${YELLOW}[INFO]${NC} $1"; }

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# -------------------------------------------
echo ""
echo "===== Part 1 端到端验证 ====="
echo ""

# 1. 目录结构
log_info "检查目录结构..."
required_dirs=(
  "packages/shared/src"
  "packages/server/src"
  "packages/web/src"
)
for d in "${required_dirs[@]}"; do
  if [ -d "$d" ]; then
    log_pass "目录存在: $d"
  else
    log_fail "目录缺失: $d"
  fi
done

# 2. 根配置文件
log_info "检查根配置文件..."
required_files=(
  "package.json"
  "pnpm-workspace.yaml"
  "tsconfig.base.json"
  "docker-compose.yml"
  ".gitignore"
  "packages/shared/package.json"
  "packages/shared/tsconfig.json"
  "packages/server/package.json"
  "packages/server/tsconfig.json"
  "packages/web/package.json"
  "packages/web/tsconfig.json"
  "packages/server/init.sql"
  "packages/server/Dockerfile"
  "packages/web/Dockerfile"
  "packages/web/nginx.conf"
)
for f in "${required_files[@]}"; do
  if [ -f "$f" ]; then
    log_pass "文件存在: $f"
  else
    log_fail "文件缺失: $f"
  fi
done

# 3. pnpm install
log_info "检查 node_modules..."
if [ -d "node_modules" ]; then
  log_pass "node_modules 存在"
else
  log_fail "node_modules 不存在，请运行 pnpm install"
fi

# 4. shared 包编译
log_info "检查 shared 包编译产物..."
shared_dist_files=(
  "packages/shared/dist/index.js"
  "packages/shared/dist/index.d.ts"
  "packages/shared/dist/types/product.d.ts"
  "packages/shared/dist/types/user.d.ts"
  "packages/shared/dist/types/cart.d.ts"
  "packages/shared/dist/types/order.d.ts"
  "packages/shared/dist/types/api.d.ts"
  "packages/shared/dist/constants.d.ts"
)
for f in "${shared_dist_files[@]}"; do
  if [ -f "$f" ]; then
    log_pass "编译产物存在: $f"
  else
    log_fail "编译产物缺失: $f"
  fi
done

# 5. init.sql 语法检查
log_info "检查 init.sql 关键表..."
tables=("users" "categories" "products" "carts" "orders" "order_items")
for t in "${tables[@]}"; do
  if grep -q "CREATE TABLE.*\`${t}\`" packages/server/init.sql; then
    log_pass "init.sql 包含表: ${t}"
  else
    log_fail "init.sql 缺少表: ${t}"
  fi
done

# 6. init.sql 种子数据
log_info "检查 init.sql 种子数据..."
if grep -q "INSERT INTO.*\`products\`" packages/server/init.sql; then
  log_pass "init.sql 包含商品种子数据"
else
  log_fail "init.sql 缺少商品种子数据"
fi

if grep -q "INSERT INTO.*\`categories\`" packages/server/init.sql; then
  log_pass "init.sql 包含分类种子数据"
else
  log_fail "init.sql 缺少分类种子数据"
fi

# 7. users 表 role 字段
log_info "检查 users 表 role 字段..."
if grep -q "\`role\`.*VARCHAR(10).*DEFAULT 'user'" packages/server/init.sql; then
  log_pass "users 表包含 role 字段 (VARCHAR(10) DEFAULT 'user')"
else
  log_fail "users 表缺少 role 字段"
fi

# 8. carts 联合唯一约束
log_info "检查 carts 联合唯一约束..."
if grep -q "uk_carts_user_product_spec" packages/server/init.sql; then
  log_pass "carts 表包含联合唯一约束 (user_id, product_id, spec_label)"
else
  log_fail "carts 表缺少联合唯一约束"
fi

# 9. docker-compose.yml 服务检查
log_info "检查 docker-compose.yml 服务..."
services=("mysql" "redis" "server" "web")
for s in "${services[@]}"; do
  if grep -q "^[[:space:]]*${s}:" docker-compose.yml; then
    log_pass "docker-compose.yml 包含服务: ${s}"
  else
    log_fail "docker-compose.yml 缺少服务: ${s}"
  fi
done

# 10. nginx.conf SPA fallback
log_info "检查 nginx.conf SPA fallback..."
if grep -q "try_files.*index.html" packages/web/nginx.conf; then
  log_pass "nginx.conf 包含 SPA fallback (try_files)"
else
  log_fail "nginx.conf 缺少 SPA fallback"
fi

if grep -q "expires 1y" packages/web/nginx.conf; then
  log_pass "nginx.conf 包含静态资源长缓存 (expires 1y)"
else
  log_fail "nginx.conf 缺少静态资源长缓存"
fi

# 11. Dockerfile 多阶段构建
log_info "检查 Dockerfile..."
if grep -q "FROM node:20-alpine AS builder" packages/server/Dockerfile; then
  log_pass "server Dockerfile 包含多阶段构建"
else
  log_fail "server Dockerfile 缺少多阶段构建"
fi

if grep -q "FROM node:20-alpine AS builder" packages/web/Dockerfile; then
  log_pass "web Dockerfile 包含多阶段构建"
else
  log_fail "web Dockerfile 缺少多阶段构建"
fi

# 12. shared 类型导出完整性
log_info "检查 shared 类型导出..."
required_exports=(
  "Product"
  "Category"
  "User"
  "LoginDTO"
  "RegisterDTO"
  "CartItem"
  "AddToCartDTO"
  "Order"
  "OrderItem"
  "CreateOrderDTO"
  "ApiResponse"
  "PaginatedResponse"
  "ErrorCode"
)
for e in "${required_exports[@]}"; do
  if grep -q "export.*${e}" packages/shared/src/index.ts; then
    log_pass "shared 导出: ${e}"
  else
    log_fail "shared 缺少导出: ${e}"
  fi
done

# -------------------------------------------
echo ""
echo "===== 验证结果 ====="
echo -e "${GREEN}PASS: ${pass}${NC}"
echo -e "${RED}FAIL: ${fail}${NC}"
echo ""

if [ "$fail" -gt 0 ]; then
  echo -e "${RED}存在失败项，请修复后重新验证。${NC}"
  exit 1
else
  echo -e "${GREEN}全部通过! Part 1 脚手架验证完成。${NC}"
  exit 0
fi
