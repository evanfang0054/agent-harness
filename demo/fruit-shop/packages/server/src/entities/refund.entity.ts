import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RefundStatus } from 'shared';

@Entity('refunds')
export class RefundEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 500 })
  reason: string;

  @Column({ name: 'prev_status', type: 'smallint' })
  prevStatus: number;

  @Column({ type: 'smallint', default: RefundStatus.PENDING })
  status: RefundStatus;

  @Column({ name: 'admin_note', length: 500, nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
