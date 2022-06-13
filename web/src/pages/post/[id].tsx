import { Box, Heading } from "@chakra-ui/react";
import { NextPage } from "next";
import { withUrqlClient } from "next-urql";
import React from "react";
import Layout from "../../components/Layout";
import { usePostQuery } from "../../generated/graphql";
import createUrqlClient from "../../utils/createUrqlClient";

// We must provide Post.getInitialProps().
// Or id will be undefined.
const Post: NextPage<{ id: number }> = ({ id }) => {
  const [{ data, fetching }] = usePostQuery({
    variables: {
      id: id,
    },
  });

  if (fetching) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div>Some error happened so there is no data.</div>
      </Layout>
    );
  }

  if (!data?.post) {
    return (
      <Layout>
        <Box>Cannot find the post.</Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Heading mb={4}>{data.post.title}</Heading>
      {data.post.title}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Post);

Post.getInitialProps = ({ query }) => {
  return {
    id: parseInt(query.id as string),
  };
};
