// client/src/types/tournament.ts
// Tournament-related TypeScript types for client-side

export type TeamMode = 'solo' | 'duo' | 'trio' | 'squad';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  mapUrl: string | null;
  rules: string | null;
  prize: number;
  entryFee: number;
  registrationOpen: boolean;
  teamMode: TeamMode;
  maxParticipants: number | null;
  currentParticipants: number;
  status: TournamentStatus;
  imageUrl: string | null;
  cloudinaryPublicId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Discord Integration
  discordRoleId?: string | null;
  discordCategoryId?: string | null;
  discordInfoChannelId?: string | null;
  discordChatChannelId?: string | null;
  discordPasswordChannelId?: string | null;
  autoCreateDiscordChannels?: boolean;
}

export type TournamentStatus = 
  | 'upcoming'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TournamentWithCreator extends Tournament {
  creator: {
    username: string;
    displayName: string;
  };
  isUserRegistered?: boolean;
  userRegistration?: TournamentRegistration;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId: string;
  status: TournamentRegistrationStatus;
  paidAmount: number | null;
  paidAt: string | null;
  teamName: string | null;
  additionalInfo: any;
  registeredAt: string;
  updatedAt: string;
}

export type TournamentRegistrationStatus =
  | 'registered'
  | 'paid'
  | 'confirmed'
  | 'cancelled';

export interface TournamentWithDetails extends Tournament {
  creator: {
    username: string;
    displayName: string;
  };
  registrations: Array<{
    id: string;
    userId: string;
    status: string;
    teamName: string | null;
    user: {
      username: string;
      displayName: string;
    };
  }>;
  isUserRegistered: boolean;
  userRegistration?: TournamentRegistration;
}

export interface CreateTournamentRequest {
  name: string;
  description?: string;
  mapUrl?: string;
  rules?: string;
  prize: number;
  entryFee: number;
  maxParticipants?: number;
  imageUrl?: string;
}

export interface UpdateTournamentRequest {
  name?: string;
  description?: string;
  mapUrl?: string;
  rules?: string;
  prize?: number;
  entryFee?: number;
  maxParticipants?: number;
  registrationOpen?: boolean;
  status?: TournamentStatus;
  imageUrl?: string;
}

export interface RegisterForTournamentRequest {
  teamName?: string;
  additionalInfo?: any;
}

export interface DiscordStatus {
  hasDiscord: boolean;
  hasRole: boolean;
  discordUsername: string | null;
  tournamentHasDiscordIntegration: boolean;
}