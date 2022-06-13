import React from "react";
import { Form, Formik } from "formik";
import { Box, Button, Flex, Link } from "@chakra-ui/react";
import Wrapper from "../components/Wrapper";
import InputField from "../components/InputField";
import { useLoginMutation } from "../generated/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import NextLink from "next/link";

// interface loginProps {};

const Login: React.FC<{}> = ({}) => {
  const router = useRouter();
  const [, login] = useLoginMutation();

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ usernameOrEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await login(values);
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push(
              typeof router.query.next === "string" ? router.query.next : "/"
            );
          }
          return response;
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="usernameOrEmail"
              placeholder="Username or email"
              label="Username or Email"
            />
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                label="Password"
                type="password"
              />
            </Box>
            <Box color="blue" mt={2}>
              {/* <Flex color='blue' mt={2}> */}
              <NextLink href="/forget-password">
                <Link ml="auto">Forgot password?</Link>
              </NextLink>
              {/* </Flex> */}
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
                Log in
              </Button>
            </Flex>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

// `export default` is required by .tsx
// export default withUrqlClient(createUrqlClient, { ssr: true })(Login);
export default Login;
