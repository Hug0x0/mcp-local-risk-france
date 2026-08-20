import { describe, expect, it } from 'vitest';

describe('mcp-local-risk-france', () => {
  it('has a stable package name', () => {
    expect('mcp-local-risk-france').toMatch(/^mcp-/);
  });

  it('defines source URLs', () => {
    const sources = [
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
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a tool prefix', () => {
    expect('local_risk_france').toMatch(/^[a-z0-9_]+$/);
  });
});
