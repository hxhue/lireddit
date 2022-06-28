import { ChakraProvider } from "@chakra-ui/react";
import { withUrqlClient } from "next-urql";
import { AppProps } from "next/app";
import Head from "next/head";
import { createClient, Provider } from "urql";
import theme from "../theme";
import createUrqlClient from "../utils/createUrqlClient";

const client = createClient(createUrqlClient());

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>
      <Provider value={client}>
        <ChakraProvider resetCSS theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
      </Provider>
    </>
  );
}

// Well, either all SSR, or no SSR.
// Otherwise urql cache is rediculously not working.
export default withUrqlClient(createUrqlClient, { ssr: true })(MyApp);
// export default MyApp;
