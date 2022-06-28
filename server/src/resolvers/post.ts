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
    // cursor: Better than offset. Creation time of a post.
    @Arg("cursor", () => String, { nullable: true }) cursor: string,
    @Ctx() { }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);

    // CAN BE SIMPLIFIED BY FieldResolver AND dataloader.
    // const userId = req.session.userId;
    // const posts: Post[] = await getConnection().query(
    //   `
    //   select p.*
    //     ${userId ? ", updoot.value as myvote" : ""}
    //   from post p
    //   ${
    //     userId
    //       ? `left join updoot on updoot."userId" = ${userId} and updoot."postId" = p.id`
    //       : ""
    //   }
    //   where p."createdAt" < $1
    //   order by p."createdAt" desc
    //   limit ${realLimit + 1}
    // `,
    //   [cursor ? new Date(parseInt(cursor)) : new Date()]
    // );
    const posts: Post[] = await getConnection().query(
      `
      select p.* from post p
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
  textSnippet(@Root() post: Post) {
    const SLICE_LIMIT = 90;
    return post.text.length > SLICE_LIMIT
      ? post.text.slice(0, SLICE_LIMIT) + "..."
      : post.text;
  }

  @FieldResolver(() => String)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async myvote(@Root() post: Post, @Ctx() { updootLoader, req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }
    const updoot = await updootLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });
    return updoot ? updoot.value : null;
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    // Now `creator` is resolved by FieldResolver
    // return Post.findOne({ where: { id }, relations: ["creator"] });
    return Post.findOne({ where: { id } });
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
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title", { nullable: true }) title: string,
    @Arg("text", { nullable: true }) text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) {
      return null;
    }
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId"=:creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();
    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const res = await Post.delete({ id, creatorId: req.session.userId });
    return typeof res.affected === "number" && res.affected > 0;
  }
}
