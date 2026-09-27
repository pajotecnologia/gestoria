import { Router, Request, Response } from 'express';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { validateBody } from '../middlewares/validate';
import { promptCompileSchema } from '../validation/schemas';

const router = Router();

export interface RTCEStructure {
  role: string;          // Papel/Personalidade da IA
  task: string;          // Missão principal e objetivos de conversão
  context: string;       // Contexto da empresa, produto, público e regras de negócio
  execution: string;     // Restrições de formato, tom de voz e diretrizes de saída
}

export interface PromptCompilerPayload {
  agentId?: string;
  templateName?: string;
  structure: RTCEStructure;
  variables: Record<string, string | number>;
}

// Substitui {{variavel}} ou {{ variavel }} de forma segura
export function interpolateVariables(template: string, variables: Record<string, string | number>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in variables) {
      return String(variables[key]);
    }
    return match; // Mantém intacto caso a variável não tenha sido preenchida
  });
}

// Compilador do Framework RTCE
export function compileRTCEPrompt(structure: RTCEStructure, variables: Record<string, string | number>): { compiledSections: RTCEStructure; fullSystemPrompt: string } {
  const compiledSections: RTCEStructure = {
    role: interpolateVariables(structure.role, variables),
    task: interpolateVariables(structure.task, variables),
    context: interpolateVariables(structure.context, variables),
    execution: interpolateVariables(structure.execution, variables),
  };

  const fullSystemPrompt = `
### [PAPEL & IDENTIDADE]
${compiledSections.role}

### [OBJETIVO & TAREFAS]
${compiledSections.task}

### [CONTEXTO & REGRAS DE NEGÓCIO]
${compiledSections.context}

### [DIRETRIZES DE EXECUÇÃO & TOM DE VOZ]
${compiledSections.execution}
`.trim();

  return { compiledSections, fullSystemPrompt };
}

router.post('/compile', tenantMiddleware, validateBody(promptCompileSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { templateName, structure, variables, agentId } = req.body as PromptCompilerPayload;

    if (!structure || !structure.role || !structure.task || !structure.context || !structure.execution) {
      res.status(400).json({ error: 'Bad Request', message: 'Estrutura RTCE incompleta.' });
      return;
    }

    const { compiledSections, fullSystemPrompt } = compileRTCEPrompt(structure, variables || {});

    const promptRecord = {
      tenantId,
      agentId: agentId || null,
      templateName: templateName || 'Custom Template',
      rawStructure: structure,
      variables: variables || {},
      compiledSections,
      fullSystemPrompt,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: promptRecord
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
