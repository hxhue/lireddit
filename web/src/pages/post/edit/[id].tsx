import { Box, Button, Flex } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import { useRouter } from "next/router";
import React from "react";
import InputField from "../../../components/InputField";
import Layout from "../../../components/Layout";
import {
  usePostQuery,
  useUpdatePostMutation,
} from "../../../generated/graphql";
import getPostIdFromUrl from "../../../utils/getPostIdFromUrl";

// We must provide Post.getInitialProps().
// Or id will be undefined.
const EditPost: React.FC<{}> = ({}) => {
  const router = useRouter();
  const id = getPostIdFromUrl();
  const [{ data, fetching }] = usePostQuery({
    variables: {
      id,
    },
  });
  const [, updatePost] = useUpdatePostMutation();

  if (fetching) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout variant="small">
      <Formik
        initialValues={{
          title: data?.post?.title ?? "",
          text: data?.post?.text ?? "",
        }}
        onSubmit={async (values, {}) => {
          await updatePost({
            id,
            ...values,
          });
          router.back();
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <Box>
              <InputField name="title" placeholder="title" label="Title" />
            </Box>
            <Box mt={4}>
              <InputField
                textarea
                name="text"
                placeholder="text"
                label="Body"
              />
            </Box>
            <Flex>
              <Button
                mt={4}
                type="submit"
                isLoading={isSubmitting}
                colorScheme="teal"
                ml="auto"
                mr="auto"
              >
                Create Post
              </Button>
            </Flex>
          </Form>
        )}
      </Formik>
    </Layout>
  );
};

export default EditPost;
