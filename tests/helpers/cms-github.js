import { createHash } from 'node:crypto';

const sha = (text) => createHash('sha1').update(text).digest('hex');
const to64 = (text) => Buffer.from(text).toString('base64');
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// In-memory GitHub API for backend tests and the local CMS preview.
// Every draft has its own immutable file snapshot; no production requests.
export function fakeGithub(files = {}, repository) {
  const refs = new Map(), blobs = new Map(), trees = new Map(), commits = new Map(), pulls = [];
  let next = 0;
  const blob = (content) => { const id = sha(content); blobs.set(id, content); return id; };
  const initial = new Map(Object.entries(files).map(([path, text]) => [path, blob(text)]));
  const treeId = sha('initial-tree'); trees.set(treeId, initial);
  const mainId = sha('initial-commit'); commits.set(mainId, { sha: mainId, tree: { sha: treeId }, parents: [] }); refs.set('main', mainId);
  const snapshot = (branch = 'main') => trees.get(commits.get(refs.get(branch) || branch)?.tree.sha);
  const ancestors = (id) => {
    const result = new Set(), pending = [id];
    while (pending.length) { const current = pending.shift(); if (result.has(current)) continue; result.add(current); pending.push(...(commits.get(current)?.parents || [])); }
    return result;
  };
  const get = (path, branch = 'main') => { const id = snapshot(branch)?.get(path); return id ? blobs.get(id) : null; };
  const options = { checks: 'success', mergeable: true, unexpectedFile: null, app: 'github-actions' };
  const requests = [];
  const fetch = async (input, init = {}) => {
    const url = new URL(input); const prefix = `/repos/${repository}/`;
    if (!url.pathname.startsWith(prefix)) return json({ error: 'Wrong repository' }, 404);
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const method = init.method || 'GET'; const body = init.body ? JSON.parse(init.body) : {};
    requests.push({ path, method, body });
    if (path.startsWith('contents/') && method === 'GET') {
      const filePath = path.slice(9), branch = url.searchParams.get('ref') || 'main', files = snapshot(branch);
      if (!files) return json({}, 404);
      const id = files.get(filePath);
      if (id) return json({ name: filePath.split('/').at(-1), path: filePath, sha: id, content: to64(blobs.get(id)), encoding: 'base64' });
      const children = [...files.keys()].filter((file) => file.startsWith(filePath + '/') && !file.slice(filePath.length + 1).includes('/'));
      if (!children.length) return json({}, 404);
      return json(children.map((file) => ({ name: file.split('/').at(-1), path: file, type: 'file', sha: files.get(file) })));
    }
    if (path.startsWith('git/matching-refs/heads/') && method === 'GET') {
      const prefix = path.slice(24);
      return json([...refs.entries()].filter(([name]) => name.startsWith(prefix)).map(([name, id]) => ({ ref: 'refs/heads/' + name, object: { sha: id } })));
    }
    if (path.startsWith('git/ref/heads/') && method === 'GET') {
      const name = path.slice(14); return refs.has(name) ? json({ ref: 'refs/heads/' + name, object: { sha: refs.get(name) } }) : json({}, 404);
    }
    if (path === 'git/refs' && method === 'POST') {
      const name = body.ref.replace('refs/heads/', ''); if (refs.has(name)) return json({}, 422);
      refs.set(name, body.sha); return json({ object: { sha: body.sha } }, 201);
    }
    if (path.startsWith('git/refs/heads/')) {
      const name = path.slice(15);
      if (method === 'DELETE') { refs.delete(name); return new Response(null, { status: 204 }); }
      if (method === 'PATCH') {
        if (!commits.get(body.sha)?.parents.includes(refs.get(name))) return json({}, 422);
        refs.set(name, body.sha); return json({ object: { sha: body.sha } });
      }
    }
    if (path === 'git/blobs' && method === 'POST') return json({ sha: blob(body.encoding === 'base64' ? Buffer.from(body.content, 'base64') : body.content) }, 201);
    if (path.startsWith('git/blobs/') && method === 'GET') return blobs.has(path.slice(10)) ? json({ content: to64(blobs.get(path.slice(10))), encoding: 'base64' }) : json({}, 404);
    if (path === 'git/trees' && method === 'POST') {
      const files = new Map(trees.get(body.base_tree));
      for (const change of body.tree) if (change.sha === null) files.delete(change.path); else files.set(change.path, change.sha);
      const id = sha('tree-' + (++next)); trees.set(id, files); return json({ sha: id }, 201);
    }
    if (path === 'git/commits' && method === 'POST') {
      const id = sha('commit-' + (++next)); commits.set(id, { sha: id, tree: { sha: body.tree }, parents: body.parents, message: body.message }); return json({ sha: id }, 201);
    }
    if (path.startsWith('git/commits/') && method === 'GET') return commits.has(path.slice(12)) ? json(commits.get(path.slice(12))) : json({}, 404);
    if (path.startsWith('git/trees/') && method === 'GET') return json({ truncated: false, tree: [...trees.get(path.slice(10)).entries()].map(([path, sha]) => ({ path, sha, type: 'blob' })) });
    if (path.startsWith('compare/') && method === 'GET') {
      const [base, head] = path.slice(8).split('...'), headAncestors = ancestors(head), baseAncestors = ancestors(base);
      return json({ behind_by: [...baseAncestors].filter((id) => !headAncestors.has(id)).length });
    }
    if (path === 'pulls' && method === 'GET') {
      const state = url.searchParams.get('state');
      const matching = pulls.filter((pr) => state === 'all' || pr.state === state);
      const page = Number(url.searchParams.get('page') || 1); return json(matching.slice((page - 1) * 100, page * 100));
    }
    if (path === 'pulls' && method === 'POST') {
      const pr = { number: pulls.length + 1, state: 'open', base: { ref: body.base }, head: { ref: body.head, sha: refs.get(body.head), repo: { full_name: repository } }, mergeable: true, mergeable_state: 'clean', merged_at: null };
      pulls.push(pr); return json(pr, 201);
    }
    const prPath = path.match(/^pulls\/(\d+)(?:\/(files|merge))?$/);
    if (prPath) {
      const pr = pulls.find((item) => item.number === Number(prPath[1])); if (!pr) return json({}, 404);
      if (pr.state === 'open') pr.head.sha = refs.get(pr.head.ref);
      if (method === 'GET' && !prPath[2]) return json({ ...pr, mergeable: options.mergeable, mergeable_state: options.mergeable == null ? 'unknown' : options.mergeable ? 'clean' : 'dirty' });
      if (method === 'PATCH') { pr.state = body.state; return json(pr); }
      if (prPath[2] === 'files') {
        const headAncestors = ancestors(refs.get(pr.head.ref));
        const base = [...ancestors(refs.get('main'))].find((id) => headAncestors.has(id));
        const main = snapshot(base), draft = snapshot(pr.head.ref);
        const changes = [...new Set([...main.keys(), ...draft.keys()])].filter((path) => main.get(path) !== draft.get(path)).map((filename) => ({ filename, sha: draft.get(filename) || main.get(filename), status: !draft.has(filename) ? 'removed' : main.has(filename) ? 'modified' : 'added' }));
        if (options.unexpectedFile) changes.push({ filename: options.unexpectedFile });
        return json(changes);
      }
      if (prPath[2] === 'merge' && method === 'PUT') {
        if (body.sha !== refs.get(pr.head.ref)) return json({}, 409);
        refs.set('main', refs.get(pr.head.ref)); pr.state = 'closed'; pr.merged_at = new Date().toISOString();
        return json({ merged: true, sha: refs.get('main') });
      }
    }
    const checks = path.match(/^commits\/([^/]+)\/check-runs$/);
    if (checks) return json({ check_runs: options.checks === 'missing' ? [] : [{ name: 'check', head_sha: checks[1], app: { slug: options.app }, status: options.checks === 'pending' ? 'in_progress' : 'completed', conclusion: options.checks }] });
    return json({ unknown: path }, 404);
  };
  const advanceMain = (changes) => {
    const files = new Map(snapshot());
    for (const [path, content] of Object.entries(changes)) if (content == null) files.delete(path); else files.set(path, blob(content));
    const tree = sha('external-tree-' + (++next)), commit = sha('external-commit-' + (++next));
    trees.set(tree, files); commits.set(commit, { sha: commit, tree: { sha: tree }, parents: [refs.get('main')], message: 'Perubahan pengelola lain' }); refs.set('main', commit);
  };
  return { fetch, refs, blobs, trees, commits, pulls, options, requests, get, advanceMain };
}
