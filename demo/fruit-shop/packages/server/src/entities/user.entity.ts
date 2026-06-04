import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from 'shared';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({ length: 50, nullable: true })
  nickname?: string;

  @Column({ length: 500, nullable: true })
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
