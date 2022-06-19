import { Box, Heading } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import Layout from "../../../components/Layout";

// We must provide Post.getInitialProps().
// Or id will be undefined.
const EditPost: React.FC<{}> = ({ }) => {
  const router = useRouter()
  const id = router.query.id
  const parsedId = typeof id === 'string' ? parseInt(id) : -1
  return (<>Hello, this is post {parsedId}</>)
};

export default EditPost;
