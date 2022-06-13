import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const checkUserAuth = () => {
  const router = useRouter();
  const [{ data, fetching }] = useMeQuery();

  useEffect(() => {
    if (!fetching && !data?.me) {
      // Save current pathname before routing.
      router.replace("/login?next=" + router.pathname);
    }
  }, [fetching, data, router]);
}