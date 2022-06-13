import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field(() => Boolean)
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const points = value == 0 ? 0 : value > 0 ? 1 : -1;
    const { userId } = req.session;

    const sqlArgs = [points, userId, postId];
    const conn = getConnection();
    // Prepared query (with arguments) can only contain one statement.
    // Solution 1: use multiple queries.
    // Solution 2: embed variables directly into query string. Since our variables
    //             are only numbers, we don't have to consider escaping problems.
    await conn.transaction(async (tm) => {
      tm.query(
        `
        update post
        set points = points + $1 - (
          with v as (
            select value from updoot where "userId"=$2 and "postId"=$3
          ), default_v as (select 0) 
          select * from v 
          union all 
          select * from default_v where not exists (select * from v)
        ) where post.id = $3;
        `,
        sqlArgs
      );
      await tm.query(
        `
        insert into updoot values($1, $2, $3)
        on conflict ("userId", "postId") do update set value=$1;
        `,
        sqlArgs
      );
    });

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    // cursor: better than offset
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);

    // May be null or undefined
    const userId = req.session.userId;

    // Raw SQL
    // Left join can be changed into a subquery:
    // -- (select value from updoot where "userId"=1 and "postId"=p.id) as myvote
    // Then there will always be a `myvote` column in result.
    const posts: Post[] = await getConnection().query(
      `
      select p.*, 
        json_build_object(
          'id',        u.id,
          'username',  u.username,
          'email',     u.email,
          'createdAt', u."createdAt",
          'updatedAt', u."updatedAt"
        ) creator 
        ${userId ? ", updoot.value as myvote" : ""}
      from post p 
      inner join public.user u on u.id = p."creatorId"
      ${
        userId
          ? `left join updoot on updoot."userId" = ${userId} and updoot."postId" = p.id`
          : ""
      }
      where p."createdAt" < $1
      order by p."createdAt" desc
      limit ${realLimit + 1}
    `,
      [cursor ? new Date(parseInt(cursor)) : new Date()]
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length > realLimit,
    };
  }

  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 120);
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    return Post.findOne({ where: { id }, relations: ["creator"] });
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save();
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", { nullable: true }) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) {
      return null;
    }
    if (typeof post.title !== "undefined") {
      post.title = title;
      // await em.persistAndFlush(post);
      await Post.update({ id }, { title });
    }
    return post;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    // You can only delete a post that you posted.

    // TODO: Return if actually deleted.
    // Done: Fix foreign key constraint.
    Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
