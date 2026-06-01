# huashu-design → design 重命名设计

**日期:** 2026-06-01
**状态:** Approved

## 目标

1. 将 skill 目录 `skills/huashu-design` 重命名为 `skills/design`
2. 删除所有"花叔Design"品牌名引用
3. 更新所有文件中的 `huashu-design` 引用为 `design`

## 变更范围

| 文件类别 | 操作 |
|---------|------|
| `skills/huashu-design/` | `git mv` → `skills/design/` |
| `skills/design/SKILL.md` | name 字段 `huashu-design` → `design`；删除"花叔Design" |
| `skills/design/README.md` | 删除"花叔Design"，更新 skill 名称引用 |
| `skills/design/README.en.md` | 删除"花叔Design"，更新 skill 名称引用 |
| `skills/design/references/*.md` | 替换 `huashu-design` → `design`，删除"花叔Design" |
| `skills/design/assets/` | 相对路径自动更新，无需手动改 |
| 其他引用文件 | 全局搜索 `huashu-design` 和 `花叔Design` 同步更新 |

## 约束

- 使用 `git mv` 保留 git 历史
- 目录内所有文件保持不动（只改目录名和内容引用）
- banner.svg 等资源路径为相对路径，目录重命名后自动正确
- React + Tailwind 模板生成能力已是默认配置，无需额外改动

## 验证

- `grep -r "huashu-design"` 返回 0 结果
- `grep -r "花叔Design"` 返回 0 结果
- skill 通过 `superpowers:design` 可正常调用
