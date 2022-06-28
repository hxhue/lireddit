import { Box, Button, Flex } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import InputField from "../components/InputField";
import Wrapper from "../components/Wrapper";
import { useForgotPasswordMutation } from "../generated/graphql";

export const ForgetPassword: React.FC<{}> = ({}) => {
  const [, forgotPassword] = useForgotPasswordMutation();
  const [complete, setComplete] = useState(false);

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values, {}) => {
          await forgotPassword(values);
          setComplete(true);
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            {complete ? (
              <Flex>
                <Box ml="auto" mr="auto">
                  We have sent an email to you.
                </Box>
              </Flex>
            ) : (
              <InputField
                name="email"
                placeholder="email"
                label="Conform your email"
              />
            )}
            <Flex>
              <Button
                disabled={complete}
                mt={4}
                type="submit"
                isLoading={isSubmitting}
                colorScheme="teal"
                ml="auto"
                mr="auto"
              >
                Send email
              </Button>
            </Flex>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default ForgetPassword;
