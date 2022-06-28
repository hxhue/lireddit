import "reflect-metadata";
import { __prod__, SESSION_COOKIE } from "./constants";
// import config from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { MyContext } from "./types";
import cors from "cors";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import { Updoot } from "./entities/Updoot";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpdootLoader } from "./utils/createUpdootLoader";

const main = async () => {
  await createConnection({
    type: "postgres",
    database: "lireddit2",
    username: "postgres",
    password: "123457",
    logging: true,
    synchronize: true, // No need to run migration if this is true
    entities: [Post, User, Updoot],
  });

  // const orm = await MikroORM.init(config);
  // await orm.getMigrator().up();

  const app = express();

  // No path (e.g. '/') is provided. Applies for all routes.
  app.use(
    cors({
      origin: [
        "https://studio.apollographql.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
      ],
      credentials: true,
    })
  );

  // To use RedisStore:
  // - redis (v3, v4 with legacyMode: true)
  // - ioredis
  // - redis-mock
  // See: https://github.com/tj/connect-redis#redisstoreoptions
  const RedisStore = connectRedis(session);
  const redisClient = new Redis();
  const redisStore = new RedisStore({
    client: redisClient,
    disableTouch: true,
  });

  app.use(
    session({
      name: SESSION_COOKIE,
      store: redisStore,
      cookie: {
        maxAge: 1000 * 3600 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
        // `sameSite: 'none'` can only be paired with `secure: true`
        // See "SameSite attribute" in https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
      },
      secret: "nufensfnewsiolas", // ** Change the secret
      resave: false,
      saveUninitialized: true,
    })
  );

  // Applied after session settings.
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({
      req,
      res,
      redis: redisClient,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }),
  });
  await apolloServer.start();
  // Apollo can use cors as an option, but it's not global.
  // Set `cors` to false, so we can use global CORS.
  apolloServer.applyMiddleware({ app, cors: false });

  const port = 4000;
  const hostname = "0.0.0.0"; // The default is "::", IP v4.
  app.listen(port, hostname, () => {
    console.log(
      `Server started on http://${
        hostname.includes("::") ? `[${hostname}]` : hostname
      }:${port}`
    );
  });

  // Fix WSL 2 slow localhost network on firefox
  // https://github.com/microsoft/WSL/issues/4340#issuecomment-515670686
  // A little better... but still slow. Use edge instead.
  // server comes from return value of app.listen()

  // server.keepAliveTimeout = 0;
};

main().catch((err) => {
  console.log(err);
});
