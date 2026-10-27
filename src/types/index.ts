export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  balance: number;
  winningCash: number;
  bonusCash: number;
  totalMatches: number;
  wonMatches: number;
  totalKills?: number;
  totalEarnings: number;
  referralEarnings: number;
  createdAt: number | object;
  referralCode: string;
  joinedTournaments?: Record<string, boolean>;
  joinedMatchSlots?: Record<string, (string | number)[]>;
  registrations?: Record<string, any>;
  isAdmin?: boolean;
  lastCheckedNotifications?: number;
  lastLogin?: number | object;
  referredBy?: string;
  username?: string;
  gameUid?: string;
  leaderboardRank?: number;
  leaderboardDisplayEarnings?: number;
  [key: string]: any;
}

export interface SlotConfig {
  type: 'disabled' | 'individual' | 'team';
  slotsPerEntry?: number;
}

export interface Teammate {
  username: string;
  gameUid: string;
}

export interface RegisteredPlayer {
  joinedAt: number | object;
  username: string;
  gameUid: string;
  teammates?: Teammate[];
  slots?: (string | number)[];
}

export interface Tournament {
  id: string;
  gameId: string;
  name: string;
  icon?: string;
  bannerUrl?: string;
  mode?: string; // Solo, Duo, Squad, 3v3
  map?: string;
  tags?: string[] | Record<string, string>;
  startTime?: number;
  entryFee: number;
  perKillPrize: number;
  prizePool: number;
  maxPlayers: number;
  registeredPlayers?: Record<string, RegisteredPlayer>;
  slots?: Record<string | number, string>; // slotNumber -> userId
  slotConfig?: SlotConfig;
  status: 'upcoming' | 'ongoing' | 'completed' | 'result' | string;
  prizeDistribution?: string | Record<string, number>;
  description?: string;
  roomId?: string;
  roomPassword?: string;
  showIdPass?: boolean;
  accessCode?: string;
}

export interface Game {
  id: string;
  name: string;
  imageUrl: string;
  order?: number;
}

export interface Promotion {
  id: string;
  imageUrl: string;
  link?: string;
}

export interface Transaction {
  id?: string;
  type: string;
  amount: number;
  description: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface DepositRequest {
  id?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  paymentMethod: string;
  upiId: string;
  utr: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number | object;
}

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userName: string;
  amount: number;
  methodDetails: {
    methodName: string;
    accountInfo: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: number | object;
  userEmail?: string;
}

export interface ChatReplyContext {
  originalSenderName: string;
  originalMessage: string;
}

export interface ChatMessage {
  id?: string;
  uid: string;
  displayName: string;
  message: string;
  timestamp: number;
  replyTo?: ChatReplyContext;
}

export interface NotificationItem {
  id?: string;
  title: string;
  message: string;
  imageUrl?: string;
  timestamp: number;
}

export interface MatchHistoryItem {
  id?: string;
  tournamentName: string;
  date: number;
  rank?: string | number;
  kills?: number;
  earnings?: number;
}

export interface TransferRequest {
  id?: string;
  senderUid: string;
  senderEmail?: string;
  senderName?: string;
  senderGameUid?: string;
  receiverUid: string;
  receiverEmail?: string;
  receiverName?: string;
  receiverGameUid?: string;
  amount: number;
  grossAmount?: number;
  feePercent?: number;
  feeAmount?: number;
  netAmount?: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: number | object;
  timestamp?: number | object;
  note?: string;
  rejectReason?: string;
  processedAt?: number;
}

export interface P2PTransfer extends TransferRequest {
}

export interface AppSettings {
  logoUrl?: string;
  splashLogoUrl?: string;
  minWithdraw?: number;
  signupBonus?: number;
  referralBonus?: number;
  transferFeePercent?: number;
  supportContact?: string;
  developerContact?: string;
  upiDetails?: string;
  qrCodeUrl?: string;
  announcementBar?: {
    isEnabled: boolean;
    text: string;
  };
  appUpdate?: {
    isUpdateAvailable: boolean;
    updateMessage?: string;
    updateUrl?: string;
  };
  theme?: Record<string, string>;
  games?: Record<string, { name: string }>;
  policyPrivacy?: string;
  policyTerms?: string;
  policyRefund?: string;
  policyFairPlay?: string;
}

export interface LotteryItem {
  id: string;
  name: string;
  bannerUrl?: string;
  entryFee: number;
  winningPrize: string | number;
  maxSlots: number;
  resultTime: number;
  status: 'upcoming' | 'resulted' | 'completed';
  winnerName?: string;
  winnerUid?: string;
  registeredUsers?: Record<string, { joinedAt: number; username?: string }>;
}

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category?: string;
  status: 'active' | 'sold' | 'inactive';
  createdAt?: number;
}

export interface ShopOrder {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  deliveryAddress: string;
  productId: string;
  productName: string;
  price: number;
  note?: string;
  status: 'pending' | 'completed' | 'cancelled';
  timestamp: number;
}

export interface TicketMessage {
  id: string;
  senderRole: 'user' | 'admin' | 'support';
  senderName: string;
  text?: string;
  attachment?: {
    url: string;
    resourceType: 'image' | 'video';
    name?: string;
  };
  timestamp: number;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  ticketType: 'hacker' | 'refund' | 'general';
  status: 'open' | 'closed';
  message?: string;
  attachment?: {
    url: string;
    resourceType: 'image' | 'video';
  };
  createdAt: number;
  updatedAt: number;
  messages?: Record<string, TicketMessage>;
}

export interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration?: string;
  thumbnailUrl?: string;
}

