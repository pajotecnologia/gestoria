export const APP_VERSION = '1.1.0';

export type ReleaseItem = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const RELEASE_HISTORY: ReleaseItem[] = [
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
