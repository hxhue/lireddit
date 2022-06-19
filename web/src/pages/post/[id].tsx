import { Box, Heading } from "@chakra-ui/react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { usePostQuery } from "../../generated/graphql";

// NextPage does not work well with SSR?
const Post: React.FC<{}> = () => {
  const router = useRouter();
  const id = router.query.id

  const [{ data, fetching }] = usePostQuery({
    variables: {
      id: typeof id === 'string' ? parseInt(id) : -1,
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

export default Post;

// For NextPage. But use router now instead.
// Post.getInitialProps = ({ query }) => {
//   return {
//     // id: parseInt(query.id as string),
//     id: query.id
//   };
// };
