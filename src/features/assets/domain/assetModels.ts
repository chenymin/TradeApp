export type AssetSaleStatus =
  | "active"
  | "upcoming"
  | "completed"
  | "paused";

export type PublicAssetSaleStatus = AssetSaleStatus | "sold_out";

export type AssetSaleFilter = "all" | "active" | "upcoming" | "completed";

export type AssetSort = "recent" | "price_asc" | "price_desc" | "progress_desc";

export type AssetChainStatus = "ready" | "loading" | "error" | "unsupported";

export type SaleStatusSource = "chain" | "database_fallback" | "unsupported";

export type SaleStatusResolution = {
  canTrustForPurchase: boolean;
  chainStatus: AssetChainStatus;
  displayStatus: AssetSaleStatus;
  source: SaleStatusSource;
};

export type AssetDatabaseRow = {
  artistName: string;
  chainId: number | null;
  contractAddress: string | null;
  id: string;
  imageUrl: string | null;
  participantsCount: number;
  saleEnd: string | null;
  saleStart: string | null;
  status: AssetSaleStatus;
  symbol: string;
  title: string;
  tokenPriceUsdt: string;
  totalSupply: string;
};

export type AssetChainReadState = {
  saleActive: boolean;
  saleCap: bigint;
  saleEndTime: bigint;
  saleStartTime: bigint;
  sold: bigint;
  status: AssetChainStatus;
};

export type PublicAssetSummary = {
  artistName: string;
  availableSharesText: string;
  chainId: number | null;
  chainStatus: AssetChainStatus;
  contractAddress: string | null;
  id: string;
  imageUrl: string | null;
  participantsCount: number;
  paymentSymbol: string;
  priceAmount: string;
  priceText: string;
  progressPercent: number;
  remainingTimeText: string | null;
  saleCapText: string;
  saleStatus: PublicAssetSaleStatus;
  soldSharesText: string;
  title: string;
  tokenCode: string;
  totalSupplyText: string;
};

export type AssetPageRequest = {
  cursor?: string;
  filter: AssetSaleFilter;
  pageSize: number;
  search?: string;
  sort?: AssetSort;
};

export type AssetPageResult = {
  items: PublicAssetSummary[];
  nextCursor: string | null;
  totalCount?: number;
};

export type AssetDatabasePage = {
  nextCursor: string | null;
  rows: AssetDatabaseRow[];
  totalCount?: number;
};

export type AssetRepository = {
  fetchAssetPage(request: AssetPageRequest): Promise<AssetDatabasePage>;
};

export type PublicAssetPageLoader = (
  request: AssetPageRequest,
) => Promise<AssetPageResult>;
