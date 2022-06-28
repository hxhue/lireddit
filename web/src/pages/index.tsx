import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import EditDeletePostButtons from "../components/EditDeletePostButtons";
import Layout from "../components/Layout";
import UpdootSection from "../components/UpdootSection";
import { useMeQuery, usePostsQuery } from "../generated/graphql";

const FIRST_FETCH_LIMIT = 15;
const FOLLOWING_FETCH_LIMIT = 5;

const Index = () => {
  const [variables, setVariables] = useState({
    limit: FIRST_FETCH_LIMIT,
    cursor: null as null | string,
  });

  const [{ data: postsData, fetching: postsFetching }] = usePostsQuery({
    variables,
  });

  const [{ data: meData }] = useMeQuery();

  return (
    <Layout>
      <Flex>
        <Heading>LiReddit</Heading>
      </Flex>
      {postsData ? (
        <Stack mt={8} spacing={8}>
          {postsData?.posts.posts.map((p) => {
            if (!p || p.id < 0) {
              return null;
            }
            return (
              <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
                <Flex>
                  <UpdootSection
                    post={p}
                    myvote={meData?.me && p.myvote ? p.myvote : 0}
                  ></UpdootSection>
                  <Box ml={8} mt={2}>
                    <NextLink href="/post/[id]" as={`/post/${p.id}`}>
                      <Link>
                        <Heading fontSize="xl">{p.title}</Heading>
                      </Link>
                    </NextLink>
                    posted by {p.creator!.username}
                    <Text mt={4}>{p.textSnippet}</Text>
                  </Box>
                </Flex>
                {meData?.me?.id === p.creatorId ? (
                  <EditDeletePostButtons postId={p.id} />
                ) : null}
              </Flex>
            );
          })}
          <Box my={4}></Box>
        </Stack>
      ) : (
        <Flex my={4} mx="auto">
          <div>Loading...</div>
        </Flex>
      )}
      {postsData && postsData.posts.hasMore ? (
        <Flex>
          <Button
            onClick={() => {
              const posts = postsData.posts.posts;
              setVariables({
                limit: FOLLOWING_FETCH_LIMIT,
                cursor: posts[posts.length - 1].createdAt,
              });
            }}
            isLoading={postsFetching}
            mt={-4}
            mb={4}
            mx="auto"
          >
            Load more
          </Button>
        </Flex>
      ) : null}
    </Layout>
  );
};

export default Index;

// Bug2022060201：Not working well with urql cache...
// After user is logged in, no update happens. Why?
// Fixed by changing cacheExchange() rules.

// Bug2022060901: And SSR is not working...
// Fixed by adding cookie to next.js in createUrqlClient().

// Bug2022061303: User already logged in but isAuth still fails.
// It seems it's not a SSR problem.
// It's a problem related to CORS. Since request site is changed into ::1, the sites won't match.
// I need to visit ::1 instead of localhost in my browser now.
