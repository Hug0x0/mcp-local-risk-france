#!/usr/bin/env node

const sources = [
  [
    "Géorisques",
    "https://www.georisques.gouv.fr/"
  ],
  [
    "Géorisques API documentation",
    "https://www.georisques.gouv.fr/doc-api"
  ],
  [
    "Géorisques public data and API access",
    "https://www.georisques.gouv.fr/acceder-la-carte-interactive-aux-bases-de-donnees-et-lapi"
  ],
  [
    "geo.api.gouv.fr",
    "https://geo.api.gouv.fr/"
  ],
  [
    "data.gouv.fr API Géorisques listing",
    "https://www.data.gouv.fr/dataservices/api-georisques"
  ]
];

let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/json,*/*',
        'User-Agent': 'mcp-local-risk-france-smoke/0.1',
      },
    });
    const body = await response.text();
    const ok = response.ok && body.length > 100;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

const api = new URL('https://www.data.gouv.fr/api/1/datasets/');
api.searchParams.set('q', 'géorisques PPR inondation');
api.searchParams.set('page_size', '1');
try {
  const response = await fetch(api);
  const body = await response.json();
  const ok = response.ok && Array.isArray(body.data);
  console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} data.gouv.fr API search`);
  if (!ok) failures += 1;
} catch (error) {
  failures += 1;
  console.log(`FAIL data.gouv.fr API search ${error.message}`);
}

process.exitCode = failures === 0 ? 0 : 1;
