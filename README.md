# mcp-local-risk-france

MCP server for French local natural, technological, and industrial risk discovery.

## Scope

French commune-level risk intelligence using Géorisques, administrative references, and open risk datasets.

## Tools

- `local_risk_france_get_sources`
- `local_risk_france_search_data_gouv`
- `local_risk_france_get_dataset`
- `local_risk_france_fetch_source_excerpt`
- `local_risk_france_explain_scope`
- `local_risk_france_list_reference_items`
- `local_risk_france_find_commune`
- `local_risk_france_get_georisques_links`
- `local_risk_france_search_risk_datasets`
- `local_risk_france_commune_brief`
- `local_risk_france_get_radon`
- `local_risk_france_get_seismic_zoning`

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "local-risk-france": {
      "command": "npx",
      "args": ["mcp-local-risk-france"]
    }
  }
}
```

## Sources

- Géorisques: https://www.georisques.gouv.fr/
- Géorisques API documentation: https://www.georisques.gouv.fr/doc-api
- Géorisques public data and API access: https://www.georisques.gouv.fr/acceder-la-carte-interactive-aux-bases-de-donnees-et-lapi
- geo.api.gouv.fr: https://geo.api.gouv.fr/
- data.gouv.fr API Géorisques listing: https://www.data.gouv.fr/dataservices/api-georisques

## Example Prompts

- "Find official risk sources for commune 97411."
- "Search data.gouv.fr for PPR and flood-risk datasets."
- "Explain how to combine Géorisques and commune codes."

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. For emergency, legal, or administrative decisions, follow the competent public service.

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Publishing notes: [`docs/publishing.md`](docs/publishing.md).

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## License

MIT
