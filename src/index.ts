#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-local-risk-france",
  "prefix": "local_risk_france",
  "title": "local risk France",
  "description": "MCP server for French local natural, technological, and industrial risk discovery.",
  "domain": "French commune-level risk intelligence using Géorisques, administrative references, and open risk datasets.",
  "sources": [
    {
      "title": "Géorisques",
      "url": "https://www.georisques.gouv.fr/"
    },
    {
      "title": "Géorisques API documentation",
      "url": "https://www.georisques.gouv.fr/doc-api"
    },
    {
      "title": "Géorisques public data and API access",
      "url": "https://www.georisques.gouv.fr/acceder-la-carte-interactive-aux-bases-de-donnees-et-lapi"
    },
    {
      "title": "geo.api.gouv.fr",
      "url": "https://geo.api.gouv.fr/"
    },
    {
      "title": "data.gouv.fr API Géorisques listing",
      "url": "https://www.data.gouv.fr/dataservices/api-georisques"
    }
  ],
  "examples": [
    "Find official risk sources for commune 97411.",
    "Search data.gouv.fr for PPR and flood-risk datasets.",
    "Explain how to combine Géorisques and commune codes."
  ],
  "dataGouvDefaultQuery": "géorisques PPR inondation",
  "localItems": []
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function htmlToText(html: string): string {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function sourceByKey(key: string) {
  const normalized = key.toLowerCase();
  return CONFIG.sources.find((source, index) =>
    String(index + 1) === normalized ||
    source.title.toLowerCase().includes(normalized) ||
    source.url.toLowerCase().includes(normalized)
  );
}

const server = new McpServer({
  name: CONFIG.name,
  version: '0.1.0',
});

server.tool(
  `${CONFIG.prefix}_get_sources`,
  `List curated official and high-value sources for ${CONFIG.title}.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    domain: CONFIG.domain,
    sources: CONFIG.sources,
    examples: CONFIG.examples,
  })
);

server.tool(
  `${CONFIG.prefix}_search_data_gouv`,
  'Search public datasets on data.gouv.fr using the official public API.',
  {
    query: z.string().default(CONFIG.dataGouvDefaultQuery).describe('Search query.'),
    page_size: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ query, page_size }) => {
    try {
      const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', String(page_size));
      const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
      return jsonResult({
        query,
        total: data.total,
        datasets: (data.data ?? []).map((dataset) => ({
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          page: dataset.page,
          organization: typeof dataset.organization === 'object' && dataset.organization
            ? (dataset.organization as Record<string, unknown>).name
            : undefined,
          resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search data.gouv.fr');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_get_dataset`,
  'Inspect one data.gouv.fr dataset by slug or id using the official public API.',
  {
    dataset: z.string().describe('Dataset slug or id.'),
  },
  async ({ dataset }) => {
    try {
      const url = `https://www.data.gouv.fr/api/1/datasets/${encodeURIComponent(dataset)}/`;
      const data = await fetchJson<Record<string, unknown>>(url);
      return jsonResult({
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        page: data.page,
        tags: data.tags,
        resources: Array.isArray(data.resources)
          ? data.resources.slice(0, 25).map((resource) => ({
              id: resource.id,
              title: resource.title,
              type: resource.type,
              format: resource.format,
              url: resource.url,
              latest: resource.latest,
            }))
          : [],
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to inspect dataset');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from one curated source URL. Use source_key as a number, title keyword, or URL fragment from get_sources.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200).describe('Maximum excerpt length.'),
  },
  async ({ source_key, max_chars }) => {
    try {
      const source = sourceByKey(source_key);
      if (!source) {
        return errorResult(`Unknown source: ${source_key}`);
      }
      const html = await fetchText(source.url);
      return jsonResult({
        source,
        excerpt: htmlToText(html).slice(0, max_chars),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);

server.tool(
  `${CONFIG.prefix}_explain_scope`,
  `Explain what this MCP is useful for and how an agent should combine its sources.`,
  {},
  async () => jsonResult({
    server: CONFIG.name,
    useful_for: CONFIG.domain,
    recommended_flow: [
      'Start with get_sources to understand trusted sources.',
      'Use search_data_gouv for discoverable French public datasets.',
      'Use get_dataset for dataset/resource inspection.',
      'Use fetch_source_excerpt for human-readable official pages.',
      'Cite official sources and avoid presenting source discovery as emergency or legal advice.',
    ],
    limitations: [
      'This is a discovery and summarization MCP, not an official authority.',
      'Some portals are HTML pages and can change without notice.',
      'For emergencies or administrative decisions, follow the competent official service.',
    ],
  })
);

server.tool(
  `${CONFIG.prefix}_list_reference_items`,
  'List built-in reference items for this MCP, when available.',
  {},
  async () => jsonResult({
    items: CONFIG.localItems,
    count: CONFIG.localItems.length,
    note: CONFIG.localItems.length > 0
      ? 'These are lightweight reference hints, not a complete authoritative dataset.'
      : 'No local reference list is bundled yet. Use the source and dataset search tools.',
  })
);

server.tool(
  'local_risk_france_find_commune',
  'Resolve a French commune by name, INSEE code, or postal code using geo.api.gouv.fr. Useful before querying local risk sources.',
  {
    query: z.string().describe('Commune name, INSEE code, or postal code. Examples: "Saint-Denis", "97411", "75056".'),
    limit: z.number().int().min(1).max(20).default(10).describe('Max communes to return.'),
  },
  async ({ query, limit }) => {
    try {
      const isCode = /^\d{5}$/.test(query);
      const isPostalCode = /^\d{5}$/.test(query);
      const url = new URL(isCode
        ? `https://geo.api.gouv.fr/communes/${query}`
        : 'https://geo.api.gouv.fr/communes');
      if (!isCode) {
        url.searchParams.set(isPostalCode ? 'codePostal' : 'nom', query);
        url.searchParams.set('boost', 'population');
        url.searchParams.set('limit', String(limit));
      }
      url.searchParams.set('fields', 'nom,code,codesPostaux,departement,region,population,centre');
      url.searchParams.set('format', 'json');
      const data = await fetchJson<Record<string, unknown> | Array<Record<string, unknown>>>(url.toString());
      const communes = Array.isArray(data) ? data : [data];
      return jsonResult({
        query,
        count: communes.length,
        communes: communes.map((commune) => ({
          name: commune.nom,
          code: commune.code,
          postal_codes: commune.codesPostaux,
          department: commune.departement,
          region: commune.region,
          population: commune.population,
          center: commune.centre,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to resolve commune');
    }
  }
);

server.tool(
  'local_risk_france_get_georisques_links',
  'Build official Géorisques and related public links for one commune INSEE code. These links are suitable for authoritative risk review.',
  {
    code_insee: z.string().regex(/^\d{5}$/).describe('Commune INSEE code, e.g. 97411, 75056, 13055.'),
  },
  async ({ code_insee }) => jsonResult({
    code_insee,
    official_links: [
      {
        title: 'Géorisques search for commune',
        url: `https://www.georisques.gouv.fr/recherche?search=${code_insee}`,
      },
      {
        title: 'Géorisques API documentation',
        url: 'https://www.georisques.gouv.fr/doc-api',
      },
      {
        title: 'data.gouv.fr API Géorisques listing',
        url: 'https://www.data.gouv.fr/dataservices/api-georisques',
      },
      {
        title: 'geo.api.gouv.fr commune record',
        url: `https://geo.api.gouv.fr/communes/${code_insee}?fields=nom,code,codesPostaux,departement,region,population,centre&format=json`,
      },
    ],
    risk_topics_to_check: [
      'natural hazards: flood, ground movement, seismicity, cyclonic/wind where relevant',
      'technological hazards: industrial sites, nuclear, pipelines, dams where relevant',
      'planning documents: PPRN/PPRT, historical disaster decrees, local prevention plans',
      'soil and pollution: BASOL/BASIAS/SIS where available',
    ],
  })
);

server.tool(
  'local_risk_france_search_risk_datasets',
  'Search data.gouv.fr for local-risk datasets, combining a risk topic and optional commune/departement context.',
  {
    topic: z.string().default('géorisques risques naturels').describe('Risk topic, e.g. "inondation", "PPR", "mouvements de terrain", "ICPE", "argiles".'),
    place: z.string().optional().describe('Optional place name/code added to the search, e.g. "974", "Saint-Denis".'),
    page_size: z.number().int().min(1).max(50).default(10).describe('Number of datasets to return.'),
  },
  async ({ topic, place, page_size }) => {
    try {
      const query = place ? `${topic} ${place}` : topic;
      const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
      url.searchParams.set('q', query);
      url.searchParams.set('page_size', String(page_size));
      const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
      return jsonResult({
        query,
        total: data.total,
        datasets: (data.data ?? []).map((dataset) => ({
          id: dataset.id,
          slug: dataset.slug,
          title: dataset.title,
          page: dataset.page,
          organization: dataset.organization && typeof dataset.organization === 'object'
            ? (dataset.organization as Record<string, unknown>).name
            : undefined,
        })),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to search risk datasets');
    }
  }
);

server.tool(
  'local_risk_france_commune_brief',
  'Create a source-oriented local-risk brief for a commune: geo.api identity, Géorisques links, and data.gouv search queries to run next.',
  {
    code_insee: z.string().regex(/^\d{5}$/).describe('Commune INSEE code.'),
  },
  async ({ code_insee }) => {
    try {
      const communeUrl = `https://geo.api.gouv.fr/communes/${code_insee}?fields=nom,code,codesPostaux,departement,region,population,centre&format=json`;
      const commune = await fetchJson<Record<string, unknown>>(communeUrl);
      return jsonResult({
        commune: {
          name: commune.nom,
          code: commune.code,
          postal_codes: commune.codesPostaux,
          department: commune.departement,
          region: commune.region,
          population: commune.population,
          center: commune.centre,
        },
        next_checks: [
          {
            topic: 'Official Géorisques commune search',
            url: `https://www.georisques.gouv.fr/recherche?search=${code_insee}`,
          },
          {
            topic: 'Risk datasets on data.gouv.fr',
            query: `géorisques ${commune.nom}`,
          },
          {
            topic: 'Planning prevention datasets',
            query: `PPR ${commune.nom}`,
          },
          {
            topic: 'Industrial and polluted-sites datasets',
            query: `ICPE BASOL BASIAS ${commune.nom}`,
          },
        ],
        disclaimer: 'This brief orients source discovery. It is not a legal risk statement or emergency advice.',
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to build commune risk brief');
    }
  }
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
