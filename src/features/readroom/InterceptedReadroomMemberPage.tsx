import { MemberBody, type MemberPageProps } from "@/features/members/contracts";
import { ReadroomLayerOutlet } from "./ReadroomLayerContext";

/** The same profile body mounted into the Readroom's intercepted route slot. */
export async function InterceptedReadroomMemberPage(props: MemberPageProps) {
  return (
    <ReadroomLayerOutlet>
      <MemberBody {...props} />
    </ReadroomLayerOutlet>
  );
}
