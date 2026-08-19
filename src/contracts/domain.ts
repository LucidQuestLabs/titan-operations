import type {
  CustomerAliasId,
  CustomerId,
  JobReleaseId,
  NormalizedValue,
  ProjectPoId,
  SourceCell,
  SourceCellId,
  SourceRecordId,
} from "./core.js";

export interface Customer {
  readonly customerId: CustomerId;
  readonly displayName: NormalizedValue<string>;
  readonly rawAliasIds: readonly CustomerAliasId[];
  readonly aliasGroupDecisionId: string | null;
}

export interface CustomerAlias {
  readonly customerAliasId: CustomerAliasId;
  readonly rawName: SourceCell<string>;
  readonly candidateKey: string;
  readonly mappedCustomerId: CustomerId;
  readonly mergeStatus: "UNREVIEWED" | "ACCEPTED" | "REJECTED";
  readonly decisionId: string | null;
}

export interface CommercialProjectPo {
  readonly projectPoId: ProjectPoId;
  readonly customerId: CustomerId;
  readonly po: NormalizedValue<string>;
  readonly projectLabel: NormalizedValue<string>;
  readonly groupingStatus: "PROVISIONAL" | "HUMAN_ACCEPTED" | "REJECTED";
  readonly memberJobReleaseIds: readonly JobReleaseId[];
}

export type MetricType =
  | "BURN_SHEETS"
  | "LINER_SHEETS"
  | "LINER_AREA"
  | "LINER_SIZE"
  | "COIL_PC_COUNT"
  | "COIL_LBS"
  | "OPTIMIZED_PC_COUNT"
  | "OPTIMIZED_LBS";

export interface MetricValue {
  readonly metricType: MetricType;
  readonly unit:
    | "COUNT"
    | "SQUARE_AREA_UNCONFIRMED"
    | "INCHES_UNCONFIRMED"
    | "POUNDS"
    | "SOURCE_DEFINED";
  readonly normalized: NormalizedValue<number | string>;
}

export interface ScheduleRecord {
  readonly dueDayRaw: SourceCell;
  readonly dueDate: NormalizedValue<string>;
  readonly dueTime: NormalizedValue<string>;
  readonly priority: NormalizedValue<number>;
}

export interface ProductionRecord {
  readonly statusRaw: SourceCell<string>;
  readonly statusCanonical: NormalizedValue<string>;
  readonly exposed: NormalizedValue<boolean>;
  readonly metrics: readonly MetricValue[];
}

export interface BuyoutRecord {
  readonly ordered: NormalizedValue<boolean>;
  readonly vendorPoComposite: SourceCell<string>;
  readonly received: NormalizedValue<boolean>;
  readonly structuredItems: null;
}

export interface DeliveryRecord {
  readonly mode: NormalizedValue<"DELIVERY" | "WILL_CALL" | "OTHER">;
  readonly dayDate: NormalizedValue<string>;
  readonly time: NormalizedValue<string>;
  readonly contactName: NormalizedValue<string>;
  readonly phone: NormalizedValue<string>;
  readonly textFlag: NormalizedValue<boolean>;
  readonly textHeaderVariant: "TEXT" | "TEXT_WHEN_COMPLETE" | "COLUMN_UNAVAILABLE";
}

export interface OfficeEvent {
  readonly eventId: string;
  readonly eventType: "SCANNED" | "CALCULATED" | "INVOICED";
  readonly raw: SourceCell<string>;
  readonly actor: NormalizedValue<string>;
  readonly occurredOn: NormalizedValue<string>;
}

export interface AnomalyOccurrence {
  readonly anomalyId: string;
  readonly anomalyType:
    | "FIELD_NOT_AVAILABLE_IN_ERA"
    | "BLANK_AVAILABLE_FIELD"
    | "EXPLICIT_NA"
    | "NONNUMERIC_METRIC"
    | "CROSS_PERIOD_ATTRIBUTION"
    | "PIECES_WITHOUT_LBS"
    | "EVENT_ORDER_REVIEW"
    | "ID_REUSE_RISK"
    | "SUMMARY_RECONCILIATION"
    | "MIXED_UNIT_SUMMARY"
    | "DATE_TIME_PARSE"
    | "VISIBILITY_UNDEFINED"
    | "FORMULA_ERROR"
    | "ROW_QUALIFICATION_REVIEW";
  readonly sourceRecordId: SourceRecordId | null;
  readonly sourceCellIds: readonly SourceCellId[];
  readonly severity: "INFO" | "REVIEW" | "BLOCKED";
  readonly explanation: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
}

export interface JobRelease {
  readonly jobReleaseId: JobReleaseId;
  readonly sourceRecordId: SourceRecordId;
  readonly customerId: CustomerId | null;
  readonly projectPoId: ProjectPoId | null;
  readonly legacyJobNumber: NormalizedValue<string>;
  readonly jobName: NormalizedValue<string>;
  readonly releaseMarker: NormalizedValue<string> | null;
  readonly remakeMarker: NormalizedValue<boolean> | null;
  readonly schedule: ScheduleRecord;
  readonly production: ProductionRecord;
  readonly buyout: BuyoutRecord;
  readonly delivery: DeliveryRecord;
  readonly officeEvents: readonly OfficeEvent[];
  readonly operationalNote: SourceCell<string> | null;
  readonly officeOnlyNote: SourceCell<string> | null;
  readonly enteredBy: NormalizedValue<string>;
  readonly anomalies: readonly AnomalyOccurrence[];
}

export interface SourceSummary {
  readonly sourceSummaryId: string;
  readonly label: string | null;
  readonly cells: readonly SourceCell[];
  readonly reconciliationState: "UNRECONCILED";
  readonly warnings: readonly (
    | "FORMULA_RANGE_MISMATCH"
    | "HARDCODED_VALUE"
    | "MIXED_UNIT_SUM"
  )[];
}

