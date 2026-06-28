import MiniSearch from 'minisearch';
import { catalog } from './catalog.js';
import type { Action } from './types.js';

/**
 * BM25-ranked search over the static action catalog.
 *
 * MiniSearch usa Okapi BM25 como função de ranking por padrão. Indexamos os
 * campos textuais relevantes de cada ação (id, domain, summary e os
 * nomes/descrições dos params) para que a busca por intenção em inglês
 * encontre a action correta mesmo sem casar a string literal.
 */

// Documento achatado que o MiniSearch indexa, derivado de cada Action.
interface IndexDoc {
  id: string;
  actionId: string;
  domain: string;
  summary: string;
  // nomes e descrições dos params concatenados, para dar recall a buscas por campo
  params: string;
}

function toDoc(action: Action): IndexDoc {
  const paramText = action.params
    .map(p => `${p.name} ${p.desc}`)
    .join(' ');
  return {
    id: action.id,
    actionId: action.id,
    domain: action.domain,
    summary: action.summary,
    params: paramText,
  };
}

/**
 * Tokenizer que separa por pontuação/espaço E por camelCase, de modo que
 * identificadores como `deleteMessageForEveryone` virem ['delete','message',
 * 'for','everyone'] — tornando o `id` (melhor sinal em inglês) pesquisável
 * termo a termo. O tokenizer padrão do MiniSearch não quebra camelCase.
 */
function tokenize(text: string): string[] {
  return text
    // insere espaço entre minúscula/dígito e maiúscula seguinte (camelCase)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // qualquer não-alfanumérico vira separador
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

const index = new MiniSearch<IndexDoc>({
  idField: 'id',
  fields: ['actionId', 'domain', 'summary', 'params'],
  // `domain` precisa ser armazenado para que o callback de filter o enxergue.
  storeFields: ['domain'],
  tokenize,
  processTerm: term => term.toLowerCase(),
  // Boost: o id e o summary descrevem melhor a intenção do que os params.
  searchOptions: {
    boost: { actionId: 3, summary: 2, domain: 1.5, params: 1 },
    prefix: true,
    fuzzy: 0.2,
    // OR + ranking BM25: não exige que todos os termos casem; ordena por
    // quantos termos (e quão raros) batem. Essencial porque os summaries do
    // catálogo são em português e nem todo termo da query terá match.
    combineWith: 'OR',
  },
});

index.addAll(catalog.map(toDoc));

// Lookup rápido id -> Action para reidratar os resultados rankeados.
const byId = new Map<string, Action>(catalog.map(a => [a.id, a]));

/**
 * Busca ações por relevância (BM25). Faz fallback para busca por substring
 * caso o BM25 não retorne nada (ex: query muito curta ou exótica).
 */
export function searchActions(
  query: string,
  domain?: string,
  limit = 10
): Action[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Nº de termos distintos na query — usado para premiar resultados que cobrem
  // mais termos (ex: "delete message" deve favorecer quem casa AMBOS os termos,
  // não quem casa só o termo comum "message").
  const queryTerms = trimmed.toLowerCase().split(/\s+/).filter(Boolean).length;

  let hits = index
    .search(trimmed, domain ? { filter: r => r.domain === domain } : {})
    // Re-rank: pondera o score BM25 pela cobertura de termos da query, para que
    // quem casa 2/2 termos vença quem casa só o termo comum (1/2).
    .map(r => {
      const matchedTerms = Object.keys((r as { match: Record<string, unknown> }).match).length;
      // fuzzy/prefix podem expandir 1 termo da query em vários do índice, então
      // limitamos a 1 para a cobertura representar "fração da query coberta".
      const coverage = queryTerms > 0 ? Math.min(matchedTerms / queryTerms, 1) : 1;
      return { id: r.id as string, score: (r.score as number) * (0.5 + coverage) };
    })
    .sort((a, b) => b.score - a.score)
    .map(r => byId.get(r.id))
    .filter((a): a is Action => Boolean(a));

  // Fallback: substring case-insensitive sobre id/domain/summary.
  if (hits.length === 0) {
    const q = trimmed.toLowerCase();
    hits = catalog.filter(action => {
      const matchesQuery =
        action.id.toLowerCase().includes(q) ||
        action.domain.toLowerCase().includes(q) ||
        action.summary.toLowerCase().includes(q);
      const matchesDomain = domain ? action.domain === domain : true;
      return matchesQuery && matchesDomain;
    });
  }

  return hits.slice(0, limit);
}
