import OpenAI from 'openai';
import axios from 'axios';
import { SQUAD_PERSONAS } from '../routes/roomRoutes';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder-key' });
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42960869-82j3-42be-923f-3602e5054d50';

export interface WhatsAppCommandResult {
  isCommand: boolean;
  handled: boolean;
}

// Envia mensagem de texto para número ou grupo no WhatsApp
export async function sendWhatsAppText(instanceName: string, recipient: string, text: string) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        number: recipient,
        text,
        delay: 1000,
        linkPreview: false,
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err: any) {
    console.error(`[WhatsApp Squad Error] Erro ao enviar texto para ${recipient}:`, err.response?.data || err.message);
  }
}

// Envia imagem gerada para número ou grupo no WhatsApp
export async function sendWhatsAppImage(instanceName: string, recipient: string, imageUrl: string, caption: string) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`,
      {
        number: recipient,
        mediatype: 'image',
        mimetype: 'image/png',
        caption,
        media: imageUrl,
        fileName: 'arte_gerada.png'
      },
      {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err: any) {
    console.error(`[WhatsApp Squad Error] Erro ao enviar imagem para ${recipient}:`, err.response?.data || err.message);
    // Fallback: envia o link como texto caso haja restrição de envio de mídia
    await sendWhatsAppText(instanceName, recipient, `${caption}\n\n🖼️ Link da Imagem Gerada: ${imageUrl}`);
  }
}

// Processador central de comandos de Squad via WhatsApp
export async function handleWhatsAppSquadCommand(
  instanceName: string,
  recipient: string,
  messageText: string,
  senderName: string
): Promise<WhatsAppCommandResult> {
  const text = messageText.trim();
  const lowerText = text.toLowerCase();

  // 1. COMANDO: !ajuda ou !help
  if (lowerText === '!ajuda' || lowerText === '!help' || lowerText === '!comandos') {
    const helpMsg = `🤖 *CENTRAL DE COMANDOS DO SQUAD DE MARKETING (GESTOR IA)*

Você pode usar os comandos abaixo neste chat ou grupo:

🚀 *!squad [seu briefing]*
Aciona a mesa redonda completa: Estrategista, Copywriter, Designer (com imagem gerada) e Roteirista de Vídeo criando juntos.

🎨 *@designer [descrição da arte]* ou *!arte [descrição]*
O Diretor de Arte cria o conceito visual e gera a imagem via DALL-E 3 na hora.

✍️ *@copywriter [tema do anúncio/post]*
A Copywriter cria 3 headlines de alta conversão + 2 copys completas (AIDA/PAS).

🧠 *@estrategista [ideia/nicho]*
O Estrategista define a tese, público-alvo e 3 ângulos de venda.

🎬 *@video [tema do reels]*
O Roteirista cria roteiro de 30s segundo a segundo para Reels/TikTok.

📊 *@trafego [nicho/produto]*
A Gestora de Tráfego define públicos de teste, estrutura de orçamento e métricas.`;

    await sendWhatsAppText(instanceName, recipient, helpMsg);
    return { isCommand: true, handled: true };
  }

  // 2. COMANDO: !squad [briefing] -> Mesa Redonda Completa no WhatsApp
  if (lowerText.startsWith('!squad') || lowerText.startsWith('/squad')) {
    const briefing = text.replace(/^(!squad|\/squad)/i, '').trim();

    if (!briefing) {
      await sendWhatsAppText(
        instanceName,
        recipient,
        `⚠️ Por favor, informe o briefing após o comando.\n*Exemplo:* \`!squad Campanha de Black Friday para Clínica Odontológica\``
      );
      return { isCommand: true, handled: true };
    }

    await sendWhatsAppText(
      instanceName,
      recipient,
      `🔥 *SQUAD DE MARKETING CONVOCADO POR ${senderName.toUpperCase()}!* \nIniciando mesa redonda com Estrategista, Copywriter, Designer e Roteirista de Vídeo... Aguarde as contribuições a seguir 👇`
    );

    let currentContext = `BRIEFING DA AGÊNCIA: ${briefing}`;

    // Executa em cadeia: Estrategista -> Copywriter -> Designer (com Imagem) -> Videomaker
    const roles: Array<keyof typeof SQUAD_PERSONAS> = ['STRATEGIST', 'COPYWRITER', 'DESIGNER', 'VIDEOMAKER'];

    for (const roleKey of roles) {
      const persona = SQUAD_PERSONAS[roleKey];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [
          { role: 'system', content: persona.systemPrompt },
          {
            role: 'user',
            content: `Briefing do WhatsApp: ${briefing}\n\nContexto dos outros especialistas até agora:\n${currentContext}\n\nPor favor, responda formatado para o WhatsApp com emojis e tópicos claros.`
          }
        ]
      });

      const replyContent = completion.choices[0].message?.content || '';
      currentContext += `\n\n[${persona.name}]: ${replyContent}`;

      // Envia a mensagem do especialista
      const headerEmoji = roleKey === 'STRATEGIST' ? '🧠' : roleKey === 'COPYWRITER' ? '✍️' : roleKey === 'DESIGNER' ? '🎨' : '🎬';
      await sendWhatsAppText(instanceName, recipient, `${headerEmoji} *[${persona.name} - ${persona.title}]*\n\n${replyContent}`);

      // Se for o designer e gerou imagem, gera e envia no WhatsApp
      if (roleKey === 'DESIGNER') {
        const promptMatch = replyContent.match(/\[IMAGE_PROMPT:\s*([\s\S]*?)\]/i);
        if (promptMatch && promptMatch[1]) {
          try {
            const imgRes = await openai.images.generate({
              model: 'dall-e-3',
              prompt: promptMatch[1].trim(),
              n: 1,
              size: '1024x1024'
            });
            const imageUrl = imgRes.data?.[0]?.url;
            if (imageUrl) {
              await sendWhatsAppImage(
                instanceName,
                recipient,
                imageUrl,
                `🎨 *Arte criada por Lucas Viana (Designer)*\n*Prompt:* ${promptMatch[1].trim()}`
              );
            }
          } catch (e: any) {
            console.warn('[WhatsApp Squad DALL-E Warning]:', e.message);
          }
        }
      }
    }

    return { isCommand: true, handled: true };
  }

  // 3. COMANDO: @designer ou !arte [prompt] -> Geração Direta de Imagem
  if (lowerText.startsWith('@designer') || lowerText.startsWith('!arte') || lowerText.startsWith('/arte')) {
    const promptDescription = text.replace(/^(@designer|!arte|\/arte)/i, '').trim();

    if (!promptDescription) {
      await sendWhatsAppText(
        instanceName,
        recipient,
        `🎨 *Lucas Viana (Designer):* Me diga o que deseja criar!\n*Exemplo:* \`@designer Um frasco de perfume luxuoso em fundo de mármore preto com iluminação dourada cinematográfica\``
      );
      return { isCommand: true, handled: true };
    }

    await sendWhatsAppText(instanceName, recipient, `🎨 *Lucas Viana (Designer):* Entendido! Gerando conceito visual e renderizando arte em alta resolução... ⏳`);

    try {
      // 1. Otimiza o prompt via GPT-4o para DALL-E 3
      const optimizedPromptRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um Diretor de Arte especialista em prompts para DALL-E 3 e Midjourney. Converta o pedido do usuário em um prompt em inglês altamente detalhado, com estilo visual, iluminação, composição e render 8k.'
          },
          { role: 'user', content: promptDescription }
        ]
      });

      const englishPrompt = optimizedPromptRes.choices[0].message?.content || promptDescription;

      // 2. Gera a imagem
      const imgRes = await openai.images.generate({
        model: 'dall-e-3',
        prompt: englishPrompt,
        n: 1,
        size: '1024x1024'
      });

      const imageUrl = imgRes.data?.[0]?.url;
      if (imageUrl) {
        await sendWhatsAppImage(
          instanceName,
          recipient,
          imageUrl,
          `🎨 *Arte Finalizada - Direção de Arte Gestor IA*\n\n📌 *Pedido:* ${promptDescription}\n💡 *Prompt IA:* ${englishPrompt}`
        );
      }
    } catch (err: any) {
      await sendWhatsAppText(instanceName, recipient, `❌ Erro ao gerar imagem: ${err.message}`);
    }

    return { isCommand: true, handled: true };
  }

  // 4. COMANDO: @copywriter [tema]
  if (lowerText.startsWith('@copywriter') || lowerText.startsWith('!copy')) {
    const copyBriefing = text.replace(/^(@copywriter|!copy)/i, '').trim();
    const persona = SQUAD_PERSONAS.COPYWRITER;

    await sendWhatsAppText(instanceName, recipient, `✍️ *Camila Rocha (Copywriter):* Escrevendo variações persuasivas para você... ⏳`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: `Briefing: ${copyBriefing}\n\nResponda formatado para WhatsApp com negritos e divisões de fácil leitura.` }
      ]
    });

    const reply = completion.choices[0].message?.content || '';
    await sendWhatsAppText(instanceName, recipient, `✍️ *[Camila Rocha - Copywriter Sênior]*\n\n${reply}`);
    return { isCommand: true, handled: true };
  }

  // 5. COMANDO: @estrategista [tema]
  if (lowerText.startsWith('@estrategista') || lowerText.startsWith('!estrategia')) {
    const stratBriefing = text.replace(/^(@estrategista|!estrategia)/i, '').trim();
    const persona = SQUAD_PERSONAS.STRATEGIST;

    await sendWhatsAppText(instanceName, recipient, `🧠 *Dr. Arthur (Estrategista):* Analisando mercado e posicionamento... ⏳`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: `Briefing: ${stratBriefing}\n\nResponda formatado para WhatsApp.` }
      ]
    });

    const reply = completion.choices[0].message?.content || '';
    await sendWhatsAppText(instanceName, recipient, `🧠 *[Dr. Arthur Valente - Estrategista]*\n\n${reply}`);
    return { isCommand: true, handled: true };
  }

  // 6. COMANDO: @video [tema]
  if (lowerText.startsWith('@video') || lowerText.startsWith('!video') || lowerText.startsWith('@roteirista')) {
    const videoBriefing = text.replace(/^(@video|!video|@roteirista)/i, '').trim();
    const persona = SQUAD_PERSONAS.VIDEOMAKER;

    await sendWhatsAppText(instanceName, recipient, `🎬 *Gabriel Sato (Vídeos):* Estruturando roteiro viral de alta retenção... ⏳`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: `Briefing: ${videoBriefing}\n\nResponda formatado para WhatsApp com cronograma de cenas (0-3s, 3-15s, etc).` }
      ]
    });

    const reply = completion.choices[0].message?.content || '';
    await sendWhatsAppText(instanceName, recipient, `🎬 *[Gabriel Sato - Roteirista de Vídeos]*\n\n${reply}`);
    return { isCommand: true, handled: true };
  }

  // 7. COMANDO: @trafego [tema]
  if (lowerText.startsWith('@trafego') || lowerText.startsWith('!trafego')) {
    const trafficBriefing = text.replace(/^(@trafego|!trafego)/i, '').trim();
    const persona = SQUAD_PERSONAS.TRAFFIC_MANAGER;

    await sendWhatsAppText(instanceName, recipient, `📊 *Renata Dias (Tráfego):* Mapeando públicos e estratégia de mídia... ⏳`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      messages: [
        { role: 'system', content: persona.systemPrompt },
        { role: 'user', content: `Briefing: ${trafficBriefing}\n\nResponda formatado para WhatsApp com públicos e divisão de orçamento.` }
      ]
    });

    const reply = completion.choices[0].message?.content || '';
    await sendWhatsAppText(instanceName, recipient, `📊 *[Renata Dias - Gestora de Tráfego]*\n\n${reply}`);
    return { isCommand: true, handled: true };
  }

  return { isCommand: false, handled: false };
}
