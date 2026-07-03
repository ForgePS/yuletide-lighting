export function recordInYear(date: Date | string | null | undefined, year: number | null) {
  if (year == null) return true;
  if (!date) return false;
  return new Date(date).getFullYear() === year;
}

export function proposalInYear(
  proposal: { season?: string | null; createdAt?: Date | string | null },
  year: number | null,
) {
  if (year == null) return true;
  if (proposal.season && String(proposal.season) === String(year)) return true;
  return recordInYear(proposal.createdAt, year);
}

export function invoiceInYear(
  invoice: { paidAt?: Date | string | null; createdAt?: Date | string | null; sentAt?: Date | string | null },
  year: number | null,
) {
  if (year == null) return true;
  return recordInYear(invoice.paidAt, year)
    || recordInYear(invoice.sentAt, year)
    || recordInYear(invoice.createdAt, year);
}

export function jobInYear(
  job: { completionDate?: Date | string | null; createdAt?: Date | string | null; scheduledDate?: Date | string | null; scheduledStart?: Date | string | null },
  year: number | null,
) {
  if (year == null) return true;
  return recordInYear(job.completionDate, year)
    || recordInYear(job.scheduledDate, year)
    || recordInYear(job.scheduledStart, year)
    || recordInYear(job.createdAt, year);
}
