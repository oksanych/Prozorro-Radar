import https from 'https';

const BASE_URL = 'https://public-api.prozorro.gov.ua/api/2.5';
const USER_AGENT = 'prozorro-radar/1.0';

export interface RawTenderSummary {
  id: string;
  dateModified: string;
  // populated only when opt_fields returns them
  status?: string;
  procurementMethodType?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawTenderDetail = Record<string, any>;

interface FetchResult {
  status: number;
  body: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getJson(url: string): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let raw = '';
      res.on('data', (chunk: string) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
        } catch (e) {
          reject(new Error(`JSON parse error for ${url}: ${(e as Error).message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<FetchResult> {
  let lastError: Error = new Error('No attempts made');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await getJson(url);
      if (result.status === 429 || result.status >= 500) {
        const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
        if (attempt < maxRetries) {
          console.warn(`  [retry ${attempt + 1}/${maxRetries}] HTTP ${result.status} for ${url}, waiting ${waitMs}ms`);
          await sleep(waitMs);
          continue;
        }
        lastError = new Error(`HTTP ${result.status} after ${maxRetries} retries`);
      } else {
        return result;
      }
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(`  [retry ${attempt + 1}/${maxRetries}] Error: ${lastError.message}, waiting ${waitMs}ms`);
        await sleep(waitMs);
      }
    }
  }
  throw lastError;
}

export interface ProzorroClient {
  fetchTenderList(offset?: string): Promise<{ data: RawTenderSummary[]; next_offset: string | null }>;
  fetchTenderDetail(tenderId: string): Promise<RawTenderDetail>;
}

export function createProzorroClient(delayMs = 200): ProzorroClient {
  return {
    async fetchTenderList(offset?: string) {
      let url = `${BASE_URL}/tenders?descending=1&limit=100&opt_fields=status,procurementMethodType`;
      if (offset) url += `&offset=${encodeURIComponent(offset)}`;

      const result = await fetchWithRetry(url);
      if (result.status !== 200) {
        throw new Error(`List fetch failed with HTTP ${result.status}`);
      }

      const body = result.body as {
        data?: RawTenderSummary[];
        next_page?: { offset?: string };
      };

      await sleep(delayMs);

      return {
        data: body.data ?? [],
        next_offset: body.next_page?.offset ?? null,
      };
    },

    async fetchTenderDetail(tenderId: string) {
      const url = `${BASE_URL}/tenders/${tenderId}`;
      const result = await fetchWithRetry(url);
      if (result.status !== 200) {
        throw new Error(`Detail fetch failed HTTP ${result.status} for ${tenderId}`);
      }

      const body = result.body as { data?: RawTenderDetail };
      if (!body.data) {
        throw new Error(`No data in response for ${tenderId}`);
      }

      await sleep(delayMs);

      return body.data;
    },
  };
}
