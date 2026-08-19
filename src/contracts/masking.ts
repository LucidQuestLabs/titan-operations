import type { JobReleaseId, SnapshotId } from "./core.js";

export interface MaskProfile {
  readonly profileId: string;
  readonly version: string;
  readonly secretRef: string;
  readonly dateShiftDays: number;
  readonly redactOfficeOnlyNotes: true;
}

export interface PresentationValue<T> {
  readonly display: T | null;
  readonly presenceLabel: string;
  readonly sourceInspectable: boolean;
}

export interface JobReleasePresentationDto {
  readonly snapshotId: SnapshotId;
  readonly jobReleaseId: JobReleaseId;
  readonly mode: "INTERNAL_DATA" | "MASKED_DEMO";
  readonly customer: PresentationValue<string>;
  readonly jobName: PresentationValue<string>;
  readonly sourceRouteToken: string;
}

