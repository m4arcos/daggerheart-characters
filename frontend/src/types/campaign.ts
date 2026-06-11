export interface Campaign {
  id: string;
  nome: string;
  codigo: string;
  criador_id: string;
  criador_nome: string;
  created_at: number;
  meu_status: 'aprovado' | 'pendente';
  total_membros: number;
  total_pendentes: number;
  cover_image?: string;
  status: 'ativa' | 'pausada' | 'arquivada';
}

export interface CampaignMember {
  user_id: string;
  nome: string;
  email: string;
  status: 'pendente' | 'aprovado';
  joined_at: number;
}

export interface CampaignDetail extends Campaign {
  membros: CampaignMember[];
  isCreator: boolean;
}
