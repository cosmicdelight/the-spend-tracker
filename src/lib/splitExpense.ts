/**
 * Whether an expense is split with someone else — i.e. your share is less than the
 * total, so somebody owes you the difference.
 *
 * A share of exactly 0 is a split: you paid, someone else owes all of it. The dialogs
 * previously gated the settled-up checkbox on `share > 0 && share < total` while their
 * save paths used `share < total`, so entering 0 hid the checkbox but still wrote
 * whatever `settledUp` happened to be left at. One definition, used by both.
 */
export function isSplitExpense(share: number, total: number): boolean {
  return share >= 0 && share < total;
}
