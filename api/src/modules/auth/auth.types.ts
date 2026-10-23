export interface AuthenticatedUser {
  id: string;
  phone: string;
}

export interface UserRecord extends AuthenticatedUser {
  createdAt?: Date;
}

export interface OtpChallenge {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

export interface AuthRepository {
  saveOtpChallenge(challenge: OtpChallenge): Promise<void>;
  findOtpChallenge(phone: string): Promise<OtpChallenge | null>;
  incrementOtpAttempts(phone: string): Promise<void>;
  deleteOtpChallenge(phone: string): Promise<void>;
  upsertUser(phone: string): Promise<UserRecord>;
}
