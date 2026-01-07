import { Slot, useActiveParams, useRouter } from "one";

export default function AuthGuardLayout() {
  const router = useRouter();
  const activeParams = useActiveParams<any>();

  if (activeParams.guarded) {
    console.warn(`not authed, redirecting`);
    // breaking, should do server-side
    router.replace("/about");
  }

  return <Slot />;
}
