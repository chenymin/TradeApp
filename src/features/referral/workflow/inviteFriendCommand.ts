import type { DashboardKycSummary } from "../../dashboard/services/dashboardKycRepository";
import type { DashboardViewerState } from "../../dashboard/services/dashboardProfileLoader";
import type { RewardsProfileRepository } from "../services/rewardsProfileRepository";

export type InviteFriendCommandResult =
  | { inviteCode: string; status: "ready"; webOrigin: string }
  | { status: "session_unavailable" }
  | { status: "kyc_required" }
  | { status: "invite_code_unavailable" }
  | { status: "origin_unavailable" }
  | { status: "unavailable" };

type InviteFriendDependencies = {
  kycLoader(state: DashboardViewerState): Promise<DashboardKycSummary | null>;
  rewardsProfileRepository: RewardsProfileRepository;
};

export async function runInviteFriendCommand({
  dependencies,
  publicWebOrigin,
  viewerState,
}: {
  dependencies: InviteFriendDependencies;
  publicWebOrigin?: string;
  viewerState: DashboardViewerState;
}): Promise<InviteFriendCommandResult> {
  if (!viewerState.isSessionReady || !viewerState.viewer) {
    return { status: "session_unavailable" };
  }

  const [profileResult, kycResult] = await Promise.allSettled([
    dependencies.rewardsProfileRepository.fetchProfile(viewerState.viewer.id),
    dependencies.kycLoader(viewerState),
  ]);

  if (profileResult.status === "rejected" || kycResult.status === "rejected") {
    return { status: "unavailable" };
  }
  if (kycResult.value?.status !== "approved") {
    return { status: "kyc_required" };
  }

  const inviteCode = profileResult.value.inviteCode?.trim();
  if (!inviteCode) {
    return { status: "invite_code_unavailable" };
  }

  const webOrigin = normalizeHttpsOrigin(publicWebOrigin);
  if (!webOrigin) {
    return { status: "origin_unavailable" };
  }

  return { inviteCode, status: "ready", webOrigin };
}

function normalizeHttpsOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
