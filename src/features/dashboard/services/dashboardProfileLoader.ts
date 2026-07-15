import type { AuthViewer } from "../../auth/domain/authViewer";
import type {
  DashboardProfile,
  DashboardProfileRepository,
} from "../domain/dashboardModels";

export type DashboardViewerState = {
  isSessionReady: boolean;
  viewer: AuthViewer | null;
};

export function createDashboardProfileLoader(
  repository: DashboardProfileRepository,
) {
  return async function loadProfile(
    state: DashboardViewerState,
  ): Promise<DashboardProfile | null> {
    if (!state.isSessionReady || !state.viewer) {
      return null;
    }

    return repository.fetchProfile(state.viewer.id);
  };
}

export type DashboardProfileLoader = ReturnType<
  typeof createDashboardProfileLoader
>;
