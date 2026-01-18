import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/preact";
import { WorkoutPage } from "./workout-page";
import { useModelLoading } from "../hooks/use-model-loading";
import { useFrameProcessing } from "./hooks/use-frame-processing";
import { useWorkoutState } from "./hooks/use-workout-state";
import { WorkoutStatus } from "@/domain/entities/workout-entity";
import { createMockWorkoutStats } from "@/test-helpers/workout-stats-factory";

vi.mock("../hooks/use-model-loading");
vi.mock("./hooks/use-frame-processing");
vi.mock("./hooks/use-workout-state");

const mockUseModelLoading = vi.mocked(useModelLoading);
const mockUseFrameProcessing = vi.mocked(useFrameProcessing);
const mockUseWorkoutState = vi.mocked(useWorkoutState);

describe("WorkoutPage", () => {
  beforeEach(() => {
    mockUseModelLoading.mockReturnValue({
      status: "ready",
      message: "",
    });

    mockUseFrameProcessing.mockReturnValue(undefined);

    mockUseWorkoutState.mockReturnValue(
      createMockWorkoutStats({
        status: WorkoutStatus.ACTIVE,
        startTime: new Date(),
        endTime: null,
        isActive: true,
        repCount: 3,
      })
    );
  });

  it("renders workout stats component", () => {
    render(<WorkoutPage />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Reps")).toBeInTheDocument();
  });
});
