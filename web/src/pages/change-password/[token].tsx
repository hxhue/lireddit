// next.js convention: extract [token] from URL

import { Box, Button, Flex, Link } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import { NextPage } from "next";
import NextLink from "next/link";
import router from "next/router";
import React, { useState } from "react";
import InputField from "../../components/InputField";
import Wrapper from "../../components/Wrapper";
import { useChangePasswordMutation } from "../../generated/graphql";
import { toErrorMap } from "../../utils/toErrorMap";

// Not React.FC?
// Because this is to be used by next.js due to [token] extraction?
export const ChangePassword: NextPage<{ token: string }> = ({ token }) => {
  const [, changePassword] = useChangePasswordMutation();
  const [tokenError, setTokenError] = useState("");

  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ newPassword: "", repeatPassword: "" }}
        onSubmit={async ({ newPassword, repeatPassword }, { setErrors }) => {
          // Check if newPassword === repeatPassword
          newPassword = newPassword.trim();
          repeatPassword = repeatPassword.trim();
          if (newPassword !== repeatPassword) {
            setErrors({
              repeatPassword: "Two passwords are not equal",
            });
            return;
          }
          // Check spaces
          if (/\s/.test(newPassword)) {
            setErrors({
              newPassword: "New password cannot contain spaces",
            });
            return;
          }

          const response = await changePassword({ token, newPassword });
          if (response.data?.changePassword.errors) {
            const errMap = toErrorMap(response.data?.changePassword.errors);
            if ("token" in errMap) {
              setTokenError(errMap.token);
            }
            setErrors(errMap);
          } else if (response.data?.changePassword.user) {
            router.push("/login");
            // TODO: invalidate urql cache
          }
        }}
      >
        {({ isSubmitting }) => (
          // TODO: validate token before showing content
          <Form>
            <InputField
              name="newPassword"
              placeholder="new password"
              label="New Password"
              type="password"
            />
            <Box mt={4}>
              <InputField
                name="repeatPassword"
                placeholder="type again"
                label="Repeat Password"
                type="password"
              />
            </Box>
            {tokenError ? (
              <Box color="red">
                {tokenError}{" "}
                <NextLink href="/forget-password" color="blue">
                  <Link color="blue">Request another token</Link>
                </NextLink>{" "}
                to change your password.
              </Box>
            ) : null}
            <Flex>
              <Button
                mt={4}
                ml="auto"
                mr="auto"
                type="submit"
                isLoading={isSubmitting}
                colorScheme="teal"
              >
                Change Password
              </Button>
            </Flex>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

ChangePassword.getInitialProps = ({ query }) => {
  return {
    token: query.token as string,
  };
};

export default ChangePassword;
