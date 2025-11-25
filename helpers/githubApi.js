import fetch from "node-fetch";

const GITHUB_API_BASE = "https://api.github.com";

// export async function githubRequest(token, path, params = {}) {
//   // `path` e.g. '/user/orgs' or '/repos/:owner/:repo/commits'
//   const url = new URL(`${GITHUB_API_BASE}${path}`);
//   Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));

//   const res = await fetch(url.toString(), {
//     headers: {
//       "Accept": "application/vnd.github+json",
//       "Authorization": `Bearer ${token}`,
//       "X-GitHub-Api-Version": "2022-11-28"
//     }
//   });
//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`GitHub API error ${res.status}: ${text}`);
//   }
//   const body = await res.json();
//   const link = res.headers.get("link");
//   return { data: body, link };
// }

// // simple paginator helper: follow 'link' header to accumulate pages
// export async function githubPaginate(token, path, params = {}, maxPages = 50) {
//   let results = [];
//   let page = 1;
//   params.per_page = params.per_page || 100;
//   while (page <= maxPages) {
//     params.page = page;
//     const { data, link } = await githubRequest(token, path, params);

//     if (Array.isArray(data)) {
//       results.push(...data);
//     } else { 
//       results.push(data); break; 
//     }
//     if (!link || !link.includes('rel="next"')) break;
//     page++;
//   }
//   return results;
// }


// sleep utility
const sleep = ms => new Promise(res => setTimeout(res, ms));

/**
 * A safe GitHub API wrapper with:
 *  - auto retry
 *  - rate limit waiting
 *  - exponential backoff
 */
export async function githubRequest(token, url, attempt = 1) {
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "GitHub-Data-Sync"
  };

  const res = await fetch(`https://api.github.com${url}`, { headers });

  // Rate limit headers
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");

  // Handle 403 rate limit / secondary limits
  if (res.status === 403) {
    console.warn("Rate limit hit. Waiting…");

    let waitMs = 10000; // default 10s
    if (remaining == 0 && reset) {
      // real rate limit reset time
      waitMs = (reset * 1000) - Date.now();
    }

    await sleep(waitMs);
    return githubRequest(token, url, attempt);
  }

  // retry on 5xx GitHub failures
  if (res.status >= 500) {
    if (attempt > 5) throw new Error("GitHub server unreachable after retries.");
    await sleep(500 * attempt);
    return githubRequest(token, url, attempt + 1);
  }

  return res.json();
}

/**
 * Pagination helper
 */
export async function githubPaginate(token, url, extraParams = {}) {
  let page = 1;
  let per_page = extraParams.per_page || 100;

  const out = [];

  while (true) {
    let fullUrl = `${url}${url.includes("?") ? "&" : "?"}page=${page}&per_page=${per_page}`;

    // append extra params
    for (const [k, v] of Object.entries(extraParams)) {
      if (k !== "per_page") fullUrl += `&${k}=${v}`;
    }

    const data = await githubRequest(token, fullUrl);

    if (!Array.isArray(data) || data.length === 0) break;

    out.push(...data);

    if (data.length < per_page) break;  // last page
    page++;
  }

  return out;
}