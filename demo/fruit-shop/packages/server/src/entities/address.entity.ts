import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('addresses')
@Index('idx_user_default', ['userId', 'isDefault'])
export class AddressEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  @Index()
  userId: number;

  @Column({ name: 'recipient_name', length: 50 })
  recipientName: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 50 })
  province: string;

  @Column({ length: 50 })
  city: string;

  @Column({ length: 50 })
  district: string;

  @Column({ length: 200 })
  detail: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
