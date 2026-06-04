import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductStatus } from 'shared';
import { CategoryEntity } from './category.entity';

@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  origin: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'original_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number;

  @Column({ length: 20 })
  unit: string;

  @Column({ length: 20 })
  sweetness: string;

  @Column({ length: 50 })
  weight: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[];

  @Column({ length: 500 })
  image: string;

  @Column({ length: 20 })
  color: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ default: 0 })
  stock: number;

  @Column({
    type: 'smallint',
    default: ProductStatus.ON,
  })
  status: ProductStatus;

  @ManyToOne(() => CategoryEntity, { eager: false })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
