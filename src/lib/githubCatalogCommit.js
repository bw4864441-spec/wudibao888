const repository = "bw4864441-spec/wudibao888";
const apiRoot = `https://api.github.com/repos/${repository}/git`;

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function request(fetchImpl, path, token, options = {}) {
  const response = await fetchImpl(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "GitHub request failed");
  return payload;
}

export async function createSharedCatalogCommit({
  token,
  catalog,
  entries,
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
}) {
  const catalogWithTimestamp = {
    ...catalog,
    updatedAt: catalog.updatedAt || now(),
  };
  const reference = await request(fetchImpl, `/repos/${repository}/git/ref/heads/main`, token);
  const currentCommit = await request(fetchImpl, `/repos/${repository}/git/commits/${reference.object.sha}`, token);

  const imageBlobs = await Promise.all(entries.map((entry) => request(fetchImpl, `/repos/${repository}/git/blobs`, token, {
    method: "POST",
    body: JSON.stringify({ content: entry.content, encoding: "base64" }),
  })));
  const catalogBlob = await request(fetchImpl, `/repos/${repository}/git/blobs`, token, {
    method: "POST",
    body: JSON.stringify({ content: toBase64(`${JSON.stringify(catalogWithTimestamp, null, 2)}\n`), encoding: "base64" }),
  });

  const tree = await request(fetchImpl, `/repos/${repository}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: currentCommit.tree.sha,
      tree: [
        ...entries.map((entry, index) => ({
          path: `public/assets/user-icons/${entry.filename}`,
          mode: "100644",
          type: "blob",
          sha: imageBlobs[index].sha,
        })),
        { path: "public/catalog.json", mode: "100644", type: "blob", sha: catalogBlob.sha },
      ],
    }),
  });
  const commit = await request(fetchImpl, `/repos/${repository}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: `Add ${entries.length} shared icon${entries.length === 1 ? "" : "s"}`,
      tree: tree.sha,
      parents: [reference.object.sha],
    }),
  });
  await request(fetchImpl, `/repos/${repository}/git/refs/heads/main`, token, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { commitSha: commit.sha };
}
