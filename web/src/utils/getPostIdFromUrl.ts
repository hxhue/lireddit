import { useRouter } from "next/router";

export default function getPostIdFromUrl() {
  const router = useRouter();
  const id = router.query.id;
  const idAsInt = typeof id === "string" ? parseInt(id) : -1;
  return idAsInt;
}
