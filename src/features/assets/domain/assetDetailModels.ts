import type { SaleStatusResolution } from "./assetModels";
import type { PublicAssetSummary } from "./assetModels";

export type AssetDetailActionState =
  | "connect_required"
  | "kyc_required"
  | "verifying_sale_status"
  | "sale_status_unavailable"
  | "not_started"
  | "not_eligible"
  | "sale_open"
  | "sold_out"
  | "sale_closed"
  | "read_only";

export type AssetEligibilityDecision = boolean | "unknown";

export type AssetDetailActionInput = {
  isLoggedIn: boolean;
  kycApproved: AssetEligibilityDecision;
  sale: SaleStatusResolution;
  soldPercent: number;
  whitelisted: AssetEligibilityDecision;
};

export type AssetDetailDatabaseRow = {
  artistName: string;
  chainId: number | null;
  contractAddress: string | null;
  creationYear: string | null;
  description: string | null;
  dimensions: string | null;
  id: string;
  imageUrl: string | null;
  material: string | null;
  participantsCount: number;
  provenance: string | null;
  saleEnd: string | null;
  saleStart: string | null;
  status: "active" | "upcoming" | "completed" | "paused";
  symbol: string;
  title: string;
  tokenPriceUsdt: string;
  totalSupply: string;
};

export type AssetValuationReport = {
  appraiser: string | null;
  confidence: string | null;
  demandLevel: string | null;
  liquidityRating: string | null;
  marketTrend: string | null;
  notes: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  reportUrl: string | null;
  valuationUsdt: string;
};

export type AssetMintEventRow = {
  amountUsdt: string;
  blockTimestamp: string | null;
  id: string;
  shares: string;
  txHash: string;
};

export type MintEventsResult = {
  events: AssetMintEventRow[];
  warning: "events_unavailable" | null;
};

export type AssetDetailRepository = {
  fetchAssetDetail(assetId: string): Promise<AssetDetailDatabaseRow>;
};

export type AssetValuationRepository = {
  fetchLatestReport(assetId: string): Promise<AssetValuationReport | null>;
};

export type MintEventsRepository = {
  fetchRecentEvents(assetId: string): Promise<MintEventsResult>;
};

export type AssetDetailContractReadyState = {
  artBalanceRaw: bigint | null;
  minPurchaseUsdtRaw: bigint;
  priceUsdtRaw: bigint;
  reservedAmount: bigint;
  saleActive: boolean;
  saleCap: bigint;
  saleEndTime: bigint;
  saleStartTime: bigint;
  sold: bigint;
  status: "ready";
  usdtAllowanceRaw: bigint | null;
  usdtBalanceRaw: bigint | null;
  usdtDecimals: number;
  usdtRaisedRaw: bigint;
};

export type AssetDetailContractState =
  | AssetDetailContractReadyState
  | { status: "error" | "unsupported" };

export type AssetDetailContractRequest = {
  chainId: number | null;
  contractAddress: string | null;
  walletAddress: string | null;
};

export type AssetDetailContractReadAdapter = {
  readDetailState(request: AssetDetailContractRequest): Promise<AssetDetailContractState>;
};

export type AssetDetailTab = "overview" | "valuation" | "rules" | "onchain";

export type AssetDetailViewer = {
  isLoggedIn: boolean;
  kycApproved: AssetEligibilityDecision;
  walletAddress: string | null;
  whitelisted: AssetEligibilityDecision;
};

export type AssetEligibilitySummary = {
  description: string;
  status: "approved" | "kyc_required" | "not_whitelisted" | "not_logged_in" | "unknown";
  title: string;
};

export type AssetDetailValuation = {
  appraiser: string | null;
  confidence: string | null;
  demandLevel: string | null;
  liquidityRating: string | null;
  marketTrend: string | null;
  notes: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  reportUrl: string | null;
  status: "available" | "empty" | "error";
  valuationText: string | null;
};

export type AssetChainEvent = {
  amountText: string;
  explorerUrl: string | null;
  id: string;
  occurredAtText: string;
  title: string;
  txHashShort: string;
  type: "purchase";
};

export type AssetDetailReadModel = {
  actionState: AssetDetailActionState;
  artistName: string;
  availableSharesText: string;
  chainId: number | null;
  chainReadState: "ready" | "error" | "unsupported";
  contractAddress: string | null;
  contractAddressShort: string;
  eligibility: AssetEligibilitySummary;
  fundedAmountText: string;
  id: string;
  imageUrl: string | null;
  minPurchaseText: string | null;
  onchain: {
    chainName: string;
    events: AssetChainEvent[];
    eventsStatus: "ready" | "empty" | "error";
    explorerUrl: string | null;
    tokenStandard: "ERC-20";
  };
  overview: {
    creationYear: string | null;
    description: string | null;
    dimensions: string | null;
    material: string | null;
    provenance: string | null;
  };
  participantsCount: number;
  priceText: string;
  progressPercent: number;
  remainingTimeText: string | null;
  reservedSharesText: string;
  rules: {
    publicSaleText: string;
    reservedText: string;
    settlementAsset: "USDT (BEP-20)";
    totalSupplyText: string;
  };
  saleCapText: string;
  saleStatus: "active" | "upcoming" | "completed" | "paused" | "sold_out";
  saleStatusSource: "chain" | "database_fallback" | "unsupported";
  soldSharesText: string;
  title: string;
  tokenCode: string;
  totalSupplyText: string;
  userAllowanceState: "unknown" | "sufficient" | "insufficient";
  userUsdtBalanceText: string | null;
  valuation: AssetDetailValuation;
};

export type AssetDetailMapperInput = {
  contract: AssetDetailContractState;
  database: AssetDetailDatabaseRow;
  events: MintEventsResult;
  nowSeconds: number;
  valuation: AssetValuationReport | null;
  valuationUnavailable: boolean;
  viewer: AssetDetailViewer;
};

export type AssetDetailWarning =
  | "valuation_unavailable"
  | "events_unavailable"
  | "chain_unavailable";

export type AssetDetailLoadRequest = {
  assetId: string;
  placeholder?: PublicAssetSummary;
  viewer: AssetDetailViewer;
};

export type AssetDetailLoadResult = {
  detail: AssetDetailReadModel;
  warnings: AssetDetailWarning[];
};

export type AssetDetailLoader = (
  request: AssetDetailLoadRequest,
) => Promise<AssetDetailLoadResult>;
