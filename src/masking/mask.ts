import { createHmac } from "node:crypto";
import type { MaskProfile } from "../contracts/index.js";
import type { OperationsPresentationDto, PresentationField } from "./presentation.js";

export interface LoadedMaskProfile extends MaskProfile {
  readonly profileKey: string;
}

export class MaskProfileError extends Error {}

const token = (profile: LoadedMaskProfile, objectType: string, id: string): string =>
  createHmac("sha256", profile.profileKey).update(`${profile.version}:${objectType}:${id}`).digest("hex");

const field = <T>(original: PresentationField<T>, display: T | null): PresentationField<T> => ({
  ...original,
  display,
  ...("normalizedDisplay" in original ? { normalizedDisplay: display } : {}),
});

const protectedFields = new Set(["legacy_job_number", "customer", "po", "job_name", "phone", "operational_note", "office_only_note", "due_date", "vendor_po_composite", "delivery_contact", "entered_by", "delivery_day_date", "scanned", "calculated", "invoiced"]);

function aliases(dtos: readonly OperationsPresentationDto[], profile: LoadedMaskProfile, objectType: string, ids: readonly string[]): ReadonlyMap<string, number> {
  const unique = [...new Set(ids.filter(Boolean))];
  const sorted = unique.map((id) => ({ id, token: token(profile, objectType, id) })).sort((a, b) => a.token.localeCompare(b.token));
  return new Map(sorted.map((item, index) => [item.id, index + 1]));
}

function exactDate(value: string | number | boolean | null): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateOffset(profile: LoadedMaskProfile): number {
  const bytes = createHmac("sha256", profile.profileKey).update(`${profile.version}:date-shift`).digest();
  const weekMagnitude = 8 + (bytes.readUInt16BE(0) % 13);
  const sign = (bytes[2] ?? 0) % 2 === 0 ? 1 : -1;
  return sign * weekMagnitude * 7;
}

export function maskPresentationDtos(
  dtos: readonly OperationsPresentationDto[],
  profile: LoadedMaskProfile | null,
): readonly OperationsPresentationDto[] {
  if (!profile || profile.profileKey.trim() === "" || profile.version.trim() === "") {
    throw new MaskProfileError("Masked Demo profile unavailable; mode activation failed closed.");
  }
  const customers = aliases(dtos, profile, "customer", dtos.map((dto) => dto.customerId ?? dto.jobReleaseId));
  const projects = aliases(dtos, profile, "project", dtos.map((dto) => dto.projectPoId));
  const releases = aliases(dtos, profile, "release", dtos.map((dto) => dto.jobReleaseId));
  const contacts = aliases(dtos, profile, "contact", dtos.map((dto) => String(dto.deliveryContact.display ?? dto.jobReleaseId)));
  const staff = aliases(dtos, profile, "staff", dtos.flatMap((dto) => [String(dto.enteredBy.display ?? dto.jobReleaseId), ...Object.values(dto.officeEvents).map((event) => String(event.display ?? dto.jobReleaseId))]));
  const vendors = aliases(dtos, profile, "vendor", dtos.map((dto) => String(dto.vendorPoComposite.display ?? dto.jobReleaseId)));
  const shiftDays = dateOffset(profile);

  return Object.freeze(dtos.map((dto) => {
    const customerOrdinal = customers.get(dto.customerId ?? dto.jobReleaseId) ?? 0;
    const projectOrdinal = projects.get(dto.projectPoId) ?? 0;
    const releaseOrdinal = releases.get(dto.jobReleaseId) ?? 0;
    const phoneDigits = Number.parseInt(token(profile, "phone", dto.jobReleaseId).slice(0, 8), 16) % 10000;
    const sourceDate = exactDate(dto.dueDate.display);
    const shiftedDate = sourceDate ? new Date(sourceDate.getTime() + shiftDays * 86_400_000).toISOString().slice(0, 10) : null;
    const deliveryDate = exactDate(dto.deliveryDayDate.display);
    const shiftedDeliveryDate = deliveryDate ? new Date(deliveryDate.getTime() + shiftDays * 86_400_000).toISOString().slice(0, 10) : null;
    const contactOrdinal = contacts.get(String(dto.deliveryContact.display ?? dto.jobReleaseId)) ?? 0;
    const staffOrdinal = staff.get(String(dto.enteredBy.display ?? dto.jobReleaseId)) ?? 0;
    const vendorOrdinal = vendors.get(String(dto.vendorPoComposite.display ?? dto.jobReleaseId)) ?? 0;
    const maskedOfficeEvents = Object.fromEntries(Object.entries(dto.officeEvents).map(([eventType, event]) => {
      if (event.presence !== "VALUE") return [eventType, event];
      const eventOrdinal = staff.get(String(event.display ?? dto.jobReleaseId)) ?? 0;
      return [eventType, field(event, `Staff ${String(eventOrdinal).padStart(3, "0")} / [DEMO-SHIFTED EVENT DATE]`)];
    })) as OperationsPresentationDto["officeEvents"];
    const maskedFieldDisplays = new Map<string, string | null>([
      ["legacy_job_number", `JR-2025-${String(releaseOrdinal).padStart(4, "0")}`],
      ["customer", `Customer ${String(customerOrdinal).padStart(3, "0")}`],
      ["po", `PO-C${String(customerOrdinal).padStart(3, "0")}-${String(projectOrdinal).padStart(3, "0")}`],
      ["job_name", `Project ${String(projectOrdinal).padStart(3, "0")} / Release ${String(releaseOrdinal).padStart(3, "0")}`],
      ["phone", dto.phone.presence === "VALUE" ? `(000) 000-${String(phoneDigits).padStart(4, "0")}` : null],
      ["operational_note", dto.operationalNote.presence === "VALUE" ? "[REDACTED IN DEMO]" : null],
      ["office_only_note", dto.officeOnlyNote.presence === "VALUE" ? "[OFFICE NOTE REDACTED]" : null],
      ["due_date", dto.dueDate.presence === "VALUE" ? shiftedDate ?? "[DATE REDACTED - UNPARSED]" : null],
      ["vendor_po_composite", dto.vendorPoComposite.presence === "VALUE" ? `Vendor ${String(vendorOrdinal).padStart(3, "0")} / Vendor PO ${String(vendorOrdinal).padStart(3, "0")}` : null],
      ["delivery_contact", dto.deliveryContact.presence === "VALUE" ? `Contact ${String(contactOrdinal).padStart(3, "0")}` : null],
      ["entered_by", dto.enteredBy.presence === "VALUE" ? `Staff ${String(staffOrdinal).padStart(3, "0")}` : null],
      ["delivery_day_date", dto.deliveryDayDate.presence === "VALUE" ? shiftedDeliveryDate ?? "[DELIVERY DETAIL REDACTED]" : null],
      ["scanned", maskedOfficeEvents.scanned.display === null ? null : String(maskedOfficeEvents.scanned.display)],
      ["calculated", maskedOfficeEvents.calculated.display === null ? null : String(maskedOfficeEvents.calculated.display)],
      ["invoiced", maskedOfficeEvents.invoiced.display === null ? null : String(maskedOfficeEvents.invoiced.display)],
    ]);
    return Object.freeze({
      ...dto,
      mode: "MASKED_DEMO" as const,
      customer: field(dto.customer, `Customer ${String(customerOrdinal).padStart(3, "0")}`),
      po: field(dto.po, `PO-C${String(customerOrdinal).padStart(3, "0")}-${String(projectOrdinal).padStart(3, "0")}`),
      jobName: field(dto.jobName, `Project ${String(projectOrdinal).padStart(3, "0")} / Release ${String(releaseOrdinal).padStart(3, "0")}`),
      legacyJobNumber: field(dto.legacyJobNumber, `JR-2025-${String(releaseOrdinal).padStart(4, "0")}`),
      phone: dto.phone.presence === "VALUE" ? field(dto.phone, `(000) 000-${String(phoneDigits).padStart(4, "0")}`) : dto.phone,
      operationalNote: dto.operationalNote.presence === "VALUE" ? field(dto.operationalNote, "[REDACTED IN DEMO]") : dto.operationalNote,
      officeOnlyNote: dto.officeOnlyNote.presence === "VALUE" ? field(dto.officeOnlyNote, "[OFFICE NOTE REDACTED]") : dto.officeOnlyNote,
      dueDate: dto.dueDate.presence === "VALUE" ? field(dto.dueDate, shiftedDate ?? "[DATE REDACTED - UNPARSED]") : dto.dueDate,
      vendorPoComposite: dto.vendorPoComposite.presence === "VALUE" ? field(dto.vendorPoComposite, maskedFieldDisplays.get("vendor_po_composite") ?? null) : dto.vendorPoComposite,
      deliveryDayDate: dto.deliveryDayDate.presence === "VALUE" ? field(dto.deliveryDayDate, maskedFieldDisplays.get("delivery_day_date") ?? null) : dto.deliveryDayDate,
      deliveryContact: dto.deliveryContact.presence === "VALUE" ? field(dto.deliveryContact, maskedFieldDisplays.get("delivery_contact") ?? null) : dto.deliveryContact,
      enteredBy: dto.enteredBy.presence === "VALUE" ? field(dto.enteredBy, maskedFieldDisplays.get("entered_by") ?? null) : dto.enteredBy,
      officeEvents: maskedOfficeEvents,
      provenance: {
        ...dto.provenance,
        sourceFile: "2025 Work Schedule",
        fields: dto.provenance.fields.map((sourceField) => protectedFields.has(sourceField.canonicalField) ? {
          ...sourceField,
          rawDisplay: maskedFieldDisplays.get(sourceField.canonicalField) ?? "[REDACTED IN DEMO]",
          formulaText: sourceField.formulaText ? "[FORMULA REDACTED]" : null,
        } : sourceField),
      },
      banner: "MASKED DEMO - NOT SOURCE DATA",
    });
  }));
}

export function findPresentationLeaks(value: unknown, sensitiveTokens: readonly string[]): readonly string[] {
  const strings: string[] = [];
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string") { strings.push(candidate); return; }
    if (Array.isArray(candidate)) { candidate.forEach(visit); return; }
    if (candidate && typeof candidate === "object") Object.values(candidate).forEach(visit);
  };
  visit(value);
  const text = strings.join("\n").toLocaleLowerCase("en-US");
  return sensitiveTokens.filter((candidate) => candidate.trim() !== "" && text.includes(candidate.toLocaleLowerCase("en-US")));
}
