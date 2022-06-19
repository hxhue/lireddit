import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Updoot } from "./Updoot";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @Column()
  creatorId: number; // Foreign key

  @Field(() => String)
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  text: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.posts)
  creator?: User;

  @OneToMany(() => Updoot, (updoot) => updoot.post)
  updoots?: Updoot[];

  // Not in database. But can be transferred by GraphQL.
  // Current (session-related) user's vote. Can be 0 |-1 | 1. But number is weaker constraint.
  // Ben calls this voteStatus in his tutorial.
  @Field(() => Int, { nullable: true })
  myvote?: number;
}
