import { User } from "../entities/User";
import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { FORGET_PASSWORD_PREFIX, SESSION_COOKIE } from "../constants";
import { sendEmail } from "../utils/sendEmail";
// import uuid from 'uuid'; // Cannot do this. No export default.
import * as uuid from "uuid";

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;

  // Map signature
  [key: string]: string;
}

// Skip undefined fields. `options` conforms to UsernamePasswordInput.
const validateInput = (options: {
  [key: string]: string;
}): FieldError[] | null => {
  const errors: FieldError[] = [];

  // Length check.
  // Shortest email possible: 6 chars (or 3 chars)
  // https://stackoverflow.com/a/1423203/13785815
  for (const [k, v] of Object.entries(options)) {
    if (k == "email") {
      continue;
    }
    if (v.length <= 2) {
      errors.push({
        field: k,
        message: "Length must be >= 3",
      });
    }
  }

  // Space check.
  for (const [k, v] of Object.entries(options)) {
    if (/\s/.test(v)) {
      errors.push({
        field: k,
        message: "Field cannot contain spaces",
      });
    }
  }

  if (options.email && !options.email.includes("@")) {
    errors.push({
      field: "email",
      message: "Email must contain '@'",
    });
  }

  if (options.username && options.username.includes("@")) {
    errors.push({
      field: "username",
      message: "Username cannot contain '@'",
    });
  }

  return errors.length > 0 ? errors : null;
};

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }
    // Not the same user. Cannot see other users' emails.
    return "";
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("newPassword") newPassword: string,
    @Arg("token") token: string,
    @Ctx() { redis }: MyContext
  ): Promise<UserResponse> {
    const passwordErrors = validateInput({ password: newPassword });
    if (passwordErrors) {
      return {
        errors: passwordErrors.map(({ message }: FieldError) => ({
          field: "newPassword",
          message,
        })),
      };
    }

    const tokenKey = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(tokenKey);
    if (!userId) {
      return {
        errors: [
          // The user keeps tab for too long.
          // When the tab opened, the token was still valid, but now it's not.
          {
            field: "token",
            message: "Token expired",
          },
        ],
      };
    }

    const parsedUserId = parseInt(userId);
    const user = await User.findOne({ where: { id: parsedUserId } });
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    user.password = await argon2.hash(newPassword);
    // await em.persistAndFlush(user);
    await User.update({ id: parsedUserId }, { password: user.password });
    await redis.del(tokenKey);
    return { user };
  }

  // Returns if forgetPassword() succeeded.
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    // const user = await em.findOne(User, { email });
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return false;
    }

    try {
      const token = uuid.v4();

      console.log("token:", token);

      // 'PX': milliseconds. 'EX': seconds.
      await redis.set(
        FORGET_PASSWORD_PREFIX + token,
        user.id,
        "PX",
        1000 * 60 * 60 * 6
      ); // 6 Hours
      await sendEmail(
        email,
        `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
      );
    } catch (e) {
      console.log(e);
      return false;
    }

    return true;
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }
    return User.findOne({ where: { id: req.session.userId } });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    // Trim all fields.
    options.email = options.email.trim();
    options.username = options.username.trim();
    options.password = options.password.trim();

    const inputErrors = validateInput(options);
    if (inputErrors) {
      return { errors: inputErrors };
    }

    const hashedPassword = await argon2.hash(options.password);

    try {
      const user = await User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      }).save();
      req.session.userId = user.id;
      return { user };
    } catch (err) {
      console.log(err);
      if (err.code === "23505") {
        // Unique primary key
        return {
          errors: [
            {
              field: "username",
              message: "username already taken",
            },
          ],
        };
      }
    }

    return { errors: [] }; // Must be some internal error
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    usernameOrEmail = usernameOrEmail.trim();
    password = password.trim();

    const user = await User.findOne({
      where: usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail },
    });

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "User does not exist",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "Password is incorrect",
          },
        ],
      };
    }

    // Stores userId
    req.session.userId = user.id;

    return { user } as UserResponse;
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        resolve(!err);
        if (!err) {
          res.clearCookie(SESSION_COOKIE);
        }
      })
    );
  }
}
