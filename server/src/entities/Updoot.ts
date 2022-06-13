import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

// @ObjectType()
@Entity()
export class Updoot extends BaseEntity {
  @Column({ type: "int" })
  value: number; // Up or down

  @PrimaryColumn()
  userId: number;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => User, (user) => user.updoots, { onDelete: "CASCADE" })
  user: User;

  @ManyToOne(() => Post, (post) => post.updoots, { onDelete: "CASCADE" })
  post: Post;
}
