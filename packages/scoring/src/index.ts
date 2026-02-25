export { checkSingleBidder } from './signals/singleBidder';
export { checkTightDeadline } from './signals/tightDeadline';
export { checkNegotiationBypass } from './signals/negotiationBypass';
export { checkBuyerConcentration } from './signals/buyerConcentration';
export { computeScore, classifyRiskLevel } from './scorer';
export type { SignalInput, SignalResult, PairData, ScoringConfig, ScoreResult } from './types';
