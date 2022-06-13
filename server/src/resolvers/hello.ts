import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
  @Query(() => String)
  hello() {
    return 'My first attempt to use graphql'
  }
}