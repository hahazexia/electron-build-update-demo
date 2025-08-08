import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique(['key'])
export class Config {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  key!: string;

  @Column('text')
  value!: string;
}
