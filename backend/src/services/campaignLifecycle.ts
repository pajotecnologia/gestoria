export type CampaignLifecycleStatus =
  | 'RASCUNHO'
  | 'AGENDADA'
  | 'ATIVA'
  | 'PAUSADA'
  | 'ENCERRADA';

export function validateCampaignPeriod(startDate: Date | null | undefined, endDate: Date | null | undefined): string | null {
  if ((startDate && !endDate) || (!startDate && endDate)) {
    return 'Informe a data inicial e a data final da campanha.';
  }
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return 'A data final não pode ser anterior à data inicial.';
  }
  return null;
}

export function getCampaignLifecycleStatus(
  isActive: boolean,
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  now = new Date()
): CampaignLifecycleStatus {
  if (!isActive) return startDate || endDate ? 'PAUSADA' : 'RASCUNHO';
  if (!startDate || !endDate) return 'RASCUNHO';
  if (now.getTime() < startDate.getTime()) return 'AGENDADA';
  if (now.getTime() > endDate.getTime()) return 'ENCERRADA';
  return 'ATIVA';
}
