export const APP_VERSION = '1.3.0';

export type ReleaseItem = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const RELEASE_HISTORY: ReleaseItem[] = [
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
