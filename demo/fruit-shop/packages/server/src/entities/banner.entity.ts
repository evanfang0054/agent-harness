import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('banners')
export class BannerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 200, nullable: true })
  subtitle: string;

  @Column({ length: 500, nullable: true })
  image: string;

  @Column({ name: 'cta_text', length: 50, nullable: true })
  ctaText: string;

  @Column({ name: 'link_type', length: 20, default: 'none' })
  linkType: string;

  @Column({ name: 'link_value', length: 500, nullable: true })
  linkValue: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
