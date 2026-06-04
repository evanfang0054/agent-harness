-- ============================================
-- 鲜果集 - 数据库初始化脚本
-- MySQL 8.0
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- -------------------------------------------
-- 1. users
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50) DEFAULT NULL,
  `avatar` VARCHAR(500) DEFAULT NULL,
  `role` VARCHAR(10) NOT NULL DEFAULT 'user',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 2. categories
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(30) NOT NULL,
  `icon` VARCHAR(50) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 3. products
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `origin` VARCHAR(50) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `unit` VARCHAR(20) DEFAULT NULL,
  `sweetness` VARCHAR(10) DEFAULT NULL,
  `weight` VARCHAR(30) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `color` VARCHAR(10) DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 999,
  `status` TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 4. carts
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `carts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `spec_label` VARCHAR(30) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_carts_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `uk_carts_user_product_spec` UNIQUE (`user_id`, `product_id`, `spec_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 5. orders
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_no` VARCHAR(32) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 0,
  `address` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `remark` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------
-- 6. order_items
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT DEFAULT NULL,
  `product_name` VARCHAR(50) NOT NULL,
  `spec_label` VARCHAR(30) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 种子数据: 分类 (5 个)
-- ============================================
INSERT INTO `categories` (`id`, `name`, `icon`, `sort_order`) VALUES
(1, 'tropical',   '🌴', 1),
(2, 'berry',      '🫐', 2),
(3, 'citrus',     '🍊', 3),
(4, 'imported',   '✈️', 4),
(5, 'all',        '🍽️', 0);

-- ============================================
-- 种子数据: 商品 (6 个)
-- ============================================
INSERT INTO `products` (`id`, `name`, `origin`, `price`, `original_price`, `unit`, `sweetness`, `weight`, `description`, `tags`, `image`, `color`, `category_id`, `stock`, `status`) VALUES
(1, '阳光芒果',   '海南三亚',
  29.90, 49.90, '斤',   '★★★★★', '350-450g/个',
  '海南三亚树上自然熟芒果，果肉细腻无纤维，甜度高，香气浓郁。',
  '["当季爆款", "树上熟", "包邮"]',
  'https://images.unsplash.com/photo-1757281096599-b9165ba74008?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#FFD32A', 1, 999, 1),

(2, '丹东草莓',   '辽宁丹东',
  39.90, 59.90, '盒/300g', '★★★★☆', '15-25g/颗',
  '辽宁丹东产地直发红颜草莓，颗颗饱满，酸甜多汁。',
  '["新品", "产地直发"]',
  'https://images.unsplash.com/photo-1708100769120-015acf75bcc1?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#FF6B6B', 2, 999, 1),

(3, '智利车厘子', '智利',
  79.90, 119.90, '斤',    '★★★★★', '10-12g/颗',
  '智利进口 JJ 级车厘子，果径大、色泽深、口感脆甜。',
  '["进口", "JJ级"]',
  'https://images.unsplash.com/photo-1559619479-25dfed32ee96?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#A3183B', 4, 999, 1),

(4, '云南蓝莓',   '云南红河',
  24.90, 39.90, '盒/125g', '★★★★☆', '12-18mm',
  '云南高原蓝莓，果粒大、花青素含量高，新鲜直达。',
  '["高原种植", "花青素"]',
  'https://images.unsplash.com/photo-1510154011132-f48b8eabd172?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#5F27CD', 2, 999, 1),

(5, '赣南脐橙',   '江西赣州',
  19.90, 34.90, '斤',    '★★★★☆', '250-350g/个',
  '赣南脐橙地标产品，皮薄多汁，甜中带微酸，维C丰富。',
  '["地标产品", "薄皮"]',
  'https://images.unsplash.com/photo-1547514701-42782101795e?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#F39C12', 3, 999, 1),

(6, '山竹',       '泰国',
  45.90, 68.00, '斤',    '★★★★★', '30-50g/个',
  '泰国直采山竹，果壳薄、果肉白嫩、清甜爽口。',
  '["进口", "泰国直采"]',
  'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?fm=jpg&q=80&w=800&auto=format&fit=crop',
  '#6C3483', 1, 999, 1);
