import React from "react";
import { Box, Button, Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { useMeQuery, useLogoutMutation } from "../generated/graphql";
import { useRouter } from "next/router";

// Fix2022060104: Users have to refresh the page so NavBar can change.
export const NavBar: React.FC<{}> = ({}) => {
  const [{ fetching: logoutFetching }, logout] = useLogoutMutation();
  // const [{ data, fetching }] = useMeQuery({
  //   pause: isServer(),
  // });
  const [{ data, fetching }] = useMeQuery();
  const router = useRouter();

  const body = () => {
    let body: string | JSX.Element = "Loading...";
    if (!fetching) {
      if (data?.me) {
        body = (
          <Flex align="center">
            <Box mr={4}>
              <NextLink href="/create-post">
                {/* Button's style. Link's function. */}
                <Button as={Link}>Create post</Button>
              </NextLink>
            </Box>
            <Box mr={4}>{data.me.username}</Box>
            <Button
              variant="link"
              onClick={() => {
                logout();
              }}
              isLoading={logoutFetching}
            >
              Log out
            </Button>
          </Flex>
        );
      } else {
        body = (
          <>
            <NextLink href="/login">
              <Link mr={4}>Log in</Link>
            </NextLink>
            <NextLink href="/register">
              <Link>Register</Link>
            </NextLink>
          </>
        );
      }
    }
    return body;
  };

  return (
    <Flex zIndex={1} position="sticky" top={0} bg="tan" p={4}>
      <Flex flex={1} align="center" maxW={800} mx="auto">
        <NextLink href="/">
          <Link>
            <div>
              <strong>Home</strong>
            </div>
          </Link>
        </NextLink>
        <Box ml="auto">{body()}</Box>
      </Flex>
    </Flex>
  );
};

export default NavBar;
