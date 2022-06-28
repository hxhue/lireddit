import {
  dedupExchange,
  Exchange,
  fetchExchange,
  stringifyVariables,
} from "urql";
import {
  Cache,
  cacheExchange,
  ResolveInfo,
  Resolver,
  Variables,
} from "@urql/exchange-graphcache";
import {
  LoginMutation,
  MeDocument,
  MeQuery,
  RegisterMutation,
  LogoutMutation,
  CreatePostMutation,
  VoteMutationVariables,
  VoteMutation,
  DeletePostMutation,
} from "../generated/graphql";
import Router from "next/router";
import { pipe, tap } from "wonka";
import gql from "graphql-tag";
import isServer from "./isServer";

const errorExchange: Exchange =
  ({ forward }) =>
  (ops$) => {
    return pipe(
      forward(ops$),
      tap(({ error }) => {
        if (error) {
          if (error?.message.includes("Not authenticated")) {
            Router.replace("/login"); // Outside of a hook. Global router.
          }
        }
      })
    );
  };

const cursorPagination = (): Resolver => {
  return (parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;
    const allFields = cache.inspectFields(entityKey);
    // According to our setting, entityKey === 'Query' and fieldName === 'posts'
    const fieldInfo = allFields.filter((info) => info.fieldName == fieldName);
    if (fieldInfo.length == 0) {
      return undefined;
    }
    
    // Since "Load more" function will pass an earlier different cursor every time,
    // fieldKey will change and cache does not have the data.
    
    // const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    // const inCache = cache.resolveFieldByKey(entityKey, fieldKey);
    // info.partial = !inCache;

    // FIXED: if info.partial is set to false, some properties will be missing from posts[].
    // FUCK URQL.
    info.partial = true;

    const results = [];
    // Combine all data. Since cache is already updated by fetching parent, we only need to
    // fetch all old data. The new data is actually inside it.
    let hasMore = true;
    for (const fi of fieldInfo) {
      const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string;
      const data = cache.resolve(key, "posts") as any[];
      if (!cache.resolve(key, "hasMore")) {
        hasMore = false;
      }
      results.push(...data);
    }

    // console.log('cursorPagination.results:', results)

    return {
      __typename: "PaginatedPosts",
      hasMore,
      posts: results,
    };

    // return parent ? parent.posts : undefined;
  };
};

const cacheRules = {
  resolvers: {
    Query: {
      // If we don't do this, new posts will directly replace previous ones.
      posts: cursorPagination(),
    },
  },
  keys: {
    PaginatedPosts: () => null, // No id
  },
  updates: {
    // urql caches queries. So we need to update data manually.
    Mutation: {
      login: (
        result: LoginMutation,
        _args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        cache.updateQuery({ query: MeDocument }, (data: MeQuery | null) => {
          // If a query is never made, data will be null.
          if (data) {
            data.me = result.login.user;
            return data;
          }
          return { me: result.login.user };
        });
        // console.log({ result, _args });
      },
      register: (
        result: RegisterMutation,
        _args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        cache.updateQuery({ query: MeDocument }, (data: MeQuery | null) => {
          if (data) {
            data.me = result.register.user;
            return data;
          }
          return { me: result.register.user };
        });
      },
      logout: (
        _result: LogoutMutation,
        _args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        // Working. Because if you can log out, you must have logged in. So
        // date exists.

        cache.updateQuery({ query: MeDocument }, (data: MeQuery | null) => {
          if (data) {
            data.me = null;
          }
          return data;
        });

        // No need to invaliate posts. myvote property is taken care of by display logic.

        // const allFields = cache.inspectFields("Query");
        // allFields.forEach((fi) => {
        //   if (fi.fieldName === "posts") {
        //     cache.invalidate("Query", "posts", fi.arguments ?? {});
        //   }
        // });
      },
      createPost: (
        _result: CreatePostMutation,
        _args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        const allFields = cache.inspectFields("Query");
        allFields.forEach((fi) => {
          if (fi.fieldName === "posts") {
            cache.invalidate("Query", "posts", fi.arguments ?? {});
          }
        });
      },
      deletePost: (
        _result: DeletePostMutation,
        args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        // Currently working. 2022/6/13 15:46.
        cache.invalidate({
          __typename: "Post",
          id: args.id as number,
        });
      },
      vote: (
        _results: VoteMutation,
        args: Variables,
        cache: Cache,
        _info: ResolveInfo
      ) => {
        const { postId, value } = args as VoteMutationVariables;
        const post = cache.readFragment(
          gql`
            fragment _tmp_cachecontrol_vote1 on Post {
              id
              points
              myvote
            }
          `,
          { id: postId }
        ) as { id: number; points: number; myvote?: number };
        // The same points. No need to update cache.
        if (post.myvote === value) {
          return;
        }
        if (post) {
          cache.writeFragment(
            gql`
              fragment _tmp_cachecontrol_vote2 on Post {
                id
                points
                myvote
              }
            `,
            {
              id: postId,
              points: post.points - (post.myvote ?? 0) + value,
              myvote: value,
            }
          );
        }
      },
    },
  },
};

export const createUrqlClient = (ssrExchange?: any, ctx?: any) => {
  // Build exchanges.
  const exchanges = [dedupExchange, cacheExchange(cacheRules), errorExchange];
  if (ssrExchange) {
    exchanges.push(ssrExchange);
  }
  exchanges.push(fetchExchange);

  // If `headers` does not contain cookie, next.js will not send cookie
  // to server. So SSR's data is incorrect.
  const cookie = isServer() ? ctx?.req?.headers?.cookie : undefined;
  const headers = cookie ? { cookie } : undefined;

  // console.log({ headers });

  return {
    // problem: extremely slow network in firefox with localhost
    url: "http://localhost:4000/graphql",
    fetchOptions: {
      credentials: "include" as const, // Include cookie
      headers, // Actually send cookie
      mode: "cors" as const,
    },
    exchanges,
  };
};

export default createUrqlClient;
