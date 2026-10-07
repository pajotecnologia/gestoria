export const APP_VERSION = '1.5.2';
export const APP_BUILD_TIME = '20:45';
export const APP_BUILD_DATE = '07/10/2026';

export type ReleaseItem = {
  version: string;
  date: string;
  time?: string;
  title: string;
  changes: string[];
};

export const RELEASE_HISTORY: ReleaseItem[] = [
  {
    version: '1.5.2',
    date: '07/10/2026',
    time: '20:45',
    title: 'Auto-Discovery Dinâmico de Modelos & Auto-Cura (Self-Healing) de IA',
    changes: [
      'Implementação de Auto-Discovery universal em tempo real: Se qualquer IA descontinuar ou alterar o nome de um modelo, o sistema busca os modelos ativos direto na API do provedor e recupera a resposta sem apresentar erros.',
      'Sincronização de Modelos em 1 Clique no painel de Provedores de IA para listar os modelos habilitados na conta do usuário.',
      'Exibição de data e horário da build logo abaixo do badge de versão no cabeçalho do sistema.',
    ],
  },
  {
    version: '1.5.1',
    date: '07/10/2026',
    time: '19:25',
    title: 'Ajustes no Fallback de IA & Otimização do Modal de Especialistas',
    changes: [
      'Correção do roteamento e fallback dinâmico entre provedores de IA (OpenAI, Gemini, Groq e Ollama), garantindo compatibilidade automática de modelos durante alternâncias de contingência.',
      'Atualização dos modelos Google Gemini para os IDs oficiais (Gemini 2.0 Flash, Gemini 1.5 Flash/Pro e Flash-Lite).',
      'Ajuste responsivo no modal de edição de especialistas para evitar estouro de tela em resoluções menores com rolagem fluida e botões de ação sempre acessíveis.',
    ],
  },
  {
    version: '1.5.0',
    date: '29/09/2026',
    title: 'Central de Relatórios Executivos em PDF & Foco Estratégico da Agência',
    changes: [
      'Novo Módulo de Relatórios Executivos: 4 modalidades de relatórios com prévia em tempo real (Performance & ROI, Plano Tático AIDA, Dossiê de Criativos/Copies e Benchmarking Geral).',
      'Exportação em 1 Clique em PDF Corporativo e Cópia Formatada para WhatsApp/E-mail.',
      'Personalização de Parecer da Agência: Inclusão de observações estratégicas do consultor e assinatura da empresa.',
      'Remoção definitiva do módulo legado de WhatsApp para garantir posicionamento 100% focado em Gestão Estratégica de Marketing, Ad Creative Studio e Performance de Tráfego.',
      'Integração total do Command Palette (Ctrl+K) e Central de Ajuda com navegação direta para os novos relatórios.',
    ],
  },
  {
    version: '1.4.0',
    date: '29/09/2026',
    title: 'Motor Fotográfico do Brasil (1080p/4K), Geração em Lote no Ad Studio & Help Interativo',
    changes: [
      'Motor de Imagens Publicitárias 100% Brasil: Pessoas reais, famílias, executivos B2B e varejo com demografia autêntica e sem distorções.',
      'Geração Simultânea de Imagens no Ad Studio: Seleção de 1, 2, 3 ou 4 variações por vez nos formatos 1:1 Feed, 9:16 Story/Reels e 16:9 Banner.',
      'Resolução de Alta Definição (1080p/4K): Eliminação total de instabilidades e oscilações, com integração prioritária ao DALL-E 3.',
      'Central de Ajuda & Guia Passo a Passo (Help Modal): Passo a passo interativo de 6 fases para dominar o fluxo de criação e gestão da agência.',
      'Sincronização Dinâmica com a Equipe de Especialistas: Camila Rocha (Copy), Lucas Viana (Design), Dr. Arthur Valente (Estratégia) e Renata Dias (Tráfego).',
    ],
  },
  {
    version: '1.3.0',
    date: '29/09/2026',
    title: 'Ad Creative Studio, Sincronização Meta Ads, Relatórios PDF & Benchmarking',
    changes: [
      'Ad Creative Studio: Geração automatizada de Hooks de alta conversão, Copies (AIDA, PAS, Storytelling), Roteiros de Vídeo (Reels/TikTok) e Briefings Visuais para designers.',
      'Sincronização 1-clique com Meta Marketing Graph API (Insights) puxando Gastos, Impressões, Cliques, Conversões e Receita.',
      'Exportação Executiva em PDF / Impressão de Alta Qualidade para Apresentação de Estratégias e Relatórios de Performance.',
      'Aba de Benchmarking no Dashboard comparando ROAS, CPL, CTR e Taxa de Conversão entre todas as campanhas da agência.',
      'Navegação reestruturada com foco em Planejamento Estratégico, Criação e Inteligência de Mídia Paga.',
    ],
  },
  {
    version: '1.2.0',
    date: '28/09/2026',
    title: 'Design Apex Shadcn, Suporte a 2 Temas & Modais Pop-up',
    changes: [
      'Novo layout estilo Apex Dashboard / Shadcn UI com Sidebar retrátil e Command Palette (Ctrl+K).',
      'Suporte nativo a 2 Temas (Modo Claro e Modo Escuro) com alternador no cabeçalho e login.',
      'Abertura de cadastro e edição de empresas e campanhas exclusivamente em Modais Pop-up centralizados.',
      'Redesign do War Room com balões de mensagens modernos e renderizador inteligente de Markdown.',
      'Tela de Provedores de IA com inclusão facilitada e atalhos rápidos (Gemini, OpenAI, Groq, Ollama).',
      'Eliminação completa de estouros de tela, grid blowout e redundâncias de botões.',
      'Plataforma 100% em Português do Brasil (pt-BR).',
    ],
  },
  {
    version: '1.1.1',
    date: '28/09/2026',
    title: 'Correção do fluxo de gerenciamento',
    changes: [
      'Formulários permanecem fechados ao entrar nos menus.',
      'Novo e Editar controlam explicitamente a abertura dos formulários.',
      'Após salvar empresa, a tela retorna para a listagem.',
      'Exclusões e atualizações recebem validação de resposta e recarregam a listagem.',
      'Cache do index.html do frontend configurado para evitar versão publicada desatualizada.',
    ],
  },
  {
    version: '1.1.0',
    date: '28/09/2026',
    title: 'Atualização atual',
    changes: [
      'Dashboard de Analytics com KPIs e evolução por período.',
      'Listagens em grid para empresas, campanhas, usuários e provedores.',
      'Fluxos de cadastro e edição separados da listagem.',
      'Ações de editar, excluir e ativar/desativar disponíveis nas listagens.',
      'Melhorias de responsividade e interface Premium Dark.',
    ],
  },
  {
    version: '1.0.0',
    date: '27/09/2026',
    title: 'Base da plataforma',
    changes: [
      'Gestão de empresas e contexto dos clientes.',
      'Gestão de campanhas e ciclo de vida.',
      'Agentes WhatsApp, especialistas e provedores de IA.',
      'Auditoria e controle de usuários.',
    ],
  },
];
