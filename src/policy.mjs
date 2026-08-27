const round = (value) => Math.round(value * 100) / 100;
export const calculateCredit = (claim) => {
  const orderedBands = [...claim.creditBands].sort((left, right) => left.upperAvailabilityPct - right.upperAvailabilityPct);
  const applicableBand = claim.measuredAvailabilityPct >= claim.targetAvailabilityPct ? null : orderedBands.find((band) => claim.measuredAvailabilityPct <= band.upperAvailabilityPct) ?? orderedBands.at(-1);
  const bandCreditPct = applicableBand?.creditPct ?? 0; const appliedCreditPct = Math.min(bandCreditPct, claim.maximumCreditPct); const uncappedCreditAmount = round(claim.monthlyFee * bandCreditPct / 100); const creditAmount = round(claim.monthlyFee * appliedCreditPct / 100);
  return { meetsTarget: claim.measuredAvailabilityPct >= claim.targetAvailabilityPct, availabilityGapPct: round(Math.max(0, claim.targetAvailabilityPct - claim.measuredAvailabilityPct)), applicableBand, bandCreditPct, maximumCreditPct: claim.maximumCreditPct, appliedCreditPct, uncappedCreditAmount, creditAmount, capped: appliedCreditPct < bandCreditPct, incidentMinutes: claim.incidentMinutes };
};
