import axios from 'axios';

export interface MetaInsightsResult {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  rawActions?: any[];
  rawActionValues?: any[];
  datePreset: string;
}

export interface MetaCampaignItem {
  id: string;
  name: string;
  status: string;
  objective?: string;
  startTime?: string;
  stopTime?: string;
}

export interface MetaAccountInfo {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
  timezoneName: string;
}

const META_GRAPH_VERSION = 'v20.0';

/**
 * Normaliza o ID da conta de anúncios para garantir o prefixo 'act_'
 */
export const normalizeAdAccountId = (id: string): string => {
  const trimmed = id.trim();
  if (trimmed.startsWith('act_')) return trimmed;
  return `act_${trimmed}`;
};

/**
 * Testa a conexão com a conta de anúncios da Meta e retorna informações básicas
 */
export const testMetaAdAccount = async (
  accessToken: string,
  adAccountId: string
): Promise<MetaAccountInfo> => {
  const actId = normalizeAdAccountId(adAccountId);
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${actId}`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: 'id,name,account_status,currency,timezone_name',
        access_token: accessToken.trim(),
      },
      timeout: 15000,
    });

    const data = response.data;
    return {
      id: data.id,
      name: data.name || 'Conta Meta Ads',
      accountStatus: data.account_status,
      currency: data.currency || 'BRL',
      timezoneName: data.timezone_name || 'America/Sao_Paulo',
    };
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.error?.message ||
      error.message ||
      'Falha ao conectar com a Meta Graph API. Verifique o Access Token e o ID da Conta.';
    throw new Error(`Meta API Error: ${errorMsg}`);
  }
};

/**
 * Lista as campanhas existentes na conta de anúncios da Meta
 */
export const listMetaCampaigns = async (
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaignItem[]> => {
  const actId = normalizeAdAccountId(adAccountId);
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${actId}/campaigns`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: 'id,name,status,objective,start_time,stop_time',
        limit: 100,
        access_token: accessToken.trim(),
      },
      timeout: 15000,
    });

    const items = response.data?.data || [];
    return items.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      startTime: c.start_time,
      stopTime: c.stop_time,
    }));
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.error?.message ||
      error.message ||
      'Falha ao listar campanhas do Meta Ads.';
    throw new Error(`Meta API Error: ${errorMsg}`);
  }
};

/**
 * Busca insights e estatísticas reais de anúncios na Meta (Conta inteira ou Campanha específica)
 */
export const fetchMetaInsights = async ({
  accessToken,
  adAccountId,
  campaignId,
  datePreset = 'maximum',
}: {
  accessToken: string;
  adAccountId?: string;
  campaignId?: string;
  datePreset?: string;
}): Promise<MetaInsightsResult> => {
  let targetId = '';
  if (campaignId && campaignId.trim()) {
    targetId = campaignId.trim();
  } else if (adAccountId && adAccountId.trim()) {
    targetId = normalizeAdAccountId(adAccountId);
  } else {
    throw new Error('Informe o ID da Conta de Anúncios ou o ID da Campanha da Meta.');
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${targetId}/insights`;

  try {
    const response = await axios.get(url, {
      params: {
        fields: 'spend,impressions,clicks,cpc,cpm,ctr,actions,action_values,cost_per_action_type,purchase_roas',
        date_preset: datePreset,
        access_token: accessToken.trim(),
      },
      timeout: 20000,
    });

    const rows = response.data?.data || [];
    if (rows.length === 0) {
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        datePreset,
      };
    }

    // A API da Meta retorna 1 linha agregada quando não há breakdown
    const row = rows[0];
    const spend = parseFloat(row.spend || '0');
    const impressions = parseInt(row.impressions || '0', 10);
    const clicks = parseInt(row.clicks || '0', 10);
    const ctr = parseFloat(row.ctr || '0');
    const cpc = parseFloat(row.cpc || '0');
    const cpm = parseFloat(row.cpm || '0');

    // Extrai conversões prioritárias (leads, compras, mensagens, cadastros)
    let conversions = 0;
    const actions: Array<{ action_type: string; value: string }> = row.actions || [];
    
    // Procura por conversões prioritárias
    const priorityActionTypes = [
      'lead',
      'onsite_conversion.lead_grouped',
      'purchase',
      'omni_purchase',
      'contact',
      'submit_application',
      'complete_registration',
      'initiate_checkout',
    ];

    let foundPriority = false;
    for (const actionType of priorityActionTypes) {
      const match = actions.find((a) => a.action_type === actionType);
      if (match) {
        conversions += parseInt(match.value || '0', 10);
        foundPriority = true;
      }
    }

    // Se não encontrou nenhuma ação prioritária, tenta somar todas as ações que representam conversão ou cliques em link
    if (!foundPriority && actions.length > 0) {
      const linkClicks = actions.find((a) => a.action_type === 'link_click');
      if (linkClicks) {
        conversions = parseInt(linkClicks.value || '0', 10);
      } else {
        conversions = parseInt(actions[0].value || '0', 10);
      }
    }

    // Extrai faturamento / receita das ações (purchase value)
    let revenue = 0;
    const actionValues: Array<{ action_type: string; value: string }> = row.action_values || [];
    const purchaseValue = actionValues.find(
      (a) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
    );
    if (purchaseValue) {
      revenue = parseFloat(purchaseValue.value || '0');
    } else if (actionValues.length > 0) {
      revenue = parseFloat(actionValues[0].value || '0');
    }

    return {
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
      ctr,
      cpc,
      cpm,
      rawActions: actions,
      rawActionValues: actionValues,
      datePreset,
    };
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.error?.message ||
      error.message ||
      'Falha ao buscar Insights do Meta Ads.';
    throw new Error(`Meta API Error: ${errorMsg}`);
  }
};
