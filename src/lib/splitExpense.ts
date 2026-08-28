/**
 * Whether an expense is split with someone else — i.e. your share is less than the
 * total, so somebody owes you the difference.
 *
 * A share of exactly 0 is a split: you paid, someone else owes all of it. The dialogs
 * previously gated the settled-up checkbox on `share > 0 && share < total` while their
 * save paths used `share < total`, so entering 0 hid the checkbox but still wrote
 * whatever `settledUp` happened to be left at. One definition, used by both — and by
 * the TransactionList filters, which ask the same question of saved rows.
 *
 * The `share >= 0` clause is defensive only: it guards the live checkbox while someone
 * is mid-typing. A negative share cannot reach the save path, because `min="0"` on the
 * input blocks submission. Share-versus-total validation is a separate concern and
 * lives in each dialog's submit handler, not here.
 */
export function isSplitExpense(share: number, total: number): boolean {
  return share >= 0 && share < total;
}

/**
 * The "Your Share" field as a number.
 *
 * Blank means "same as the total" — what the field's placeholder promises. Unparseable
 * input means the same thing, rather than 0: while someone types a decimal the value
 * passes through states like "." and "-", and reading those as 0 would flash the
 * settled-up checkbox on and off, since 0 is a legitimate split.
 */
export function resolveShare(shareInput: string, total: number): number {
  const parsed = parseFloat(shareInput);
  return Number.isFinite(parsed) ? parsed : total;
}

/**
 * Whether the entered share is impossible — larger than the total.
 *
 * Separate from isSplitExpense, which only classifies: this is the rule that rejects.
 * It must be applied at every path that writes personal_amount, not just the one where
 * a bug happened to surface. Today that is: the add dialog, the edit dialog, the CSV
 * importer, and the recurring generator — the last of which writes up to 60 rows from a
 * single submission, so one unchecked entry becomes sixty bad transactions.
 */
export function shareExceedsTotal(share: number, total: number): boolean {
  return share > total;
}
