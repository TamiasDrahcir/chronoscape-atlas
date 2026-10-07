const JSON_PATH = 'public/data/challenges.json'
const IMAGE_PREFIX = 'public/images/'
const PAGES_JSON_PATH = 'data/challenges.json'
const PAGES_IMAGE_PREFIX = 'images/'
const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024
const MAX_UPLOADS = 12
const MAX_CHALLENGES = 500
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 4

function response(body, status, origin, env, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...extraHeaders,
  })
  const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    headers.set('Access-Control-Max-Age', '600')
  }
  return new Response(JSON.stringify(body), { status, headers })
}

function base64UrlEncode(bytes) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
}

async function constantTimeEqual(left, right) {
  const encoder = new TextEncoder()
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ])
  const a = new Uint8Array(leftHash)
  const b = new Uint8Array(rightHash)
  let difference = 0
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index]
  return difference === 0
}

async function createToken(username, secret) {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS })))
  return `${payload}.${base64UrlEncode(await hmac(payload, secret))}`
}

async function verifyToken(token, env) {
  if (!token || !env.ADMIN_SESSION_SECRET) return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  try {
    if (!await constantTimeEqual(base64UrlEncode(await hmac(payload, env.ADMIN_SESSION_SECRET)), signature)) return false
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
    return claims.sub === env.ADMIN_USERNAME && Number.isInteger(claims.exp) && claims.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function getBearerToken(request) {
  const authorization = request.headers.get('Authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

async function readJsonBody(request, maxBytes = 40 * 1024 * 1024) {
  const declaredSize = Number(request.headers.get('Content-Length') || 0)
  if (declaredSize > maxBytes) throw new Error('The request is too large.')
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('The request is too large.')
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('The request body must be valid JSON.')
  }
}

function validateChallenges(value) {
  if (!Array.isArray(value) || value.length > MAX_CHALLENGES) throw new Error(`Challenges must be an array of no more than ${MAX_CHALLENGES} entries.`)
  const ids = new Set()
  const imagePaths = new Set()
  let activeCount = 0
  for (const [index, row] of value.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Challenge ${index + 1} must be an object.`)
    if (typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.id)) throw new Error(`Challenge ${index + 1} needs a lowercase, unique ID using letters, numbers, and hyphens.`)
    if (ids.has(row.id)) throw new Error(`Challenge ID “${row.id}” is duplicated.`)
    ids.add(row.id)
    if (typeof row.image !== 'string' || !/^images\/[a-z0-9][a-z0-9._-]{0,159}\.(?:jpe?g|png|webp)$/i.test(row.image)) throw new Error(`Challenge “${row.id}” must reference a JPG, PNG, or WebP file directly inside images/.`)
    imagePaths.add(row.image.slice('images/'.length))
    for (const field of ['alt', 'caption', 'photoNote', 'title', 'category', 'date', 'place', 'description']) {
      if (typeof row[field] !== 'string' || !row[field].trim() || row[field].length > (field === 'description' ? 4000 : 500)) throw new Error(`Challenge “${row.id}” has an empty or overlong ${field} field.`)
    }
    if (!Number.isFinite(row.lat) || row.lat < -90 || row.lat > 90 || !Number.isFinite(row.lng) || row.lng < -180 || row.lng > 180) throw new Error(`Challenge “${row.id}” has invalid coordinates.`)
    if (!Number.isFinite(Date.parse(row.date))) throw new Error(`Challenge “${row.id}” has an invalid date.`)
    if (row.active !== undefined && typeof row.active !== 'boolean') throw new Error(`Challenge “${row.id}” has an invalid active flag.`)
    if (row.active !== false) activeCount += 1
  }
  if (activeCount < 5) throw new Error('Keep at least five active challenges so the five-round game remains playable.')
  return imagePaths
}

function decodeBase64(value) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('An uploaded image has invalid base64 data.')
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Each image must be 6 MB or smaller.')
  return bytes
}

function isAllowedImage(bytes, filename) {
  const extension = filename.split('.').pop().toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (extension === 'png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  if (extension === 'webp') return String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  return false
}

function decodeUtf8Base64(value) {
  const binary = atob(value.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

async function githubRequest(env, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ChronoScopeAtlas-Admin',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const result = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof result?.message === 'string' ? result.message : `GitHub returned HTTP ${response.status}.`
    throw new Error(detail)
  }
  return result
}

function repoPath(env, path) {
  return `/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/${path}`
}

async function loadSourceChallenges(env) {
  const branch = encodeURIComponent(env.SOURCE_BRANCH || 'main')
  const file = await githubRequest(env, `${repoPath(env, 'contents')}/${JSON_PATH}?ref=${branch}`)
  if (file?.encoding !== 'base64' || typeof file.content !== 'string') throw new Error('Could not read the source challenge archive from GitHub.')
  const parsed = JSON.parse(decodeUtf8Base64(file.content))
  if (!Array.isArray(parsed)) throw new Error('The source challenge archive is not a JSON array.')
  return parsed
}

async function makeBlob(env, content, encoding = 'utf-8') {
  return githubRequest(env, `${repoPath(env, 'git/blobs')}`, {
    method: 'POST',
    body: JSON.stringify({ content, encoding }),
  })
}

async function commitBranch(env, branchName, mutations, message) {
  const branch = encodeURIComponent(branchName)
  const ref = await githubRequest(env, `${repoPath(env, `git/ref/heads/${branch}`)}`)
  const parentSha = ref?.object?.sha
  if (!parentSha) throw new Error(`Could not find the “${branchName}” branch.`)
  const parent = await githubRequest(env, `${repoPath(env, `git/commits/${parentSha}`)}`)
  const treeEntries = []
  for (const mutation of mutations) {
    if (mutation.remove) {
      treeEntries.push({ path: mutation.path, mode: '100644', type: 'blob', sha: null })
    } else {
      const blob = await makeBlob(env, mutation.content, mutation.encoding)
      treeEntries.push({ path: mutation.path, mode: '100644', type: 'blob', sha: blob.sha })
    }
  }
  const tree = await githubRequest(env, `${repoPath(env, 'git/trees')}`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeEntries }),
  })
  const commit = await githubRequest(env, `${repoPath(env, 'git/commits')}`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  })
  await githubRequest(env, `${repoPath(env, `git/refs/heads/${branch}`)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })
}

async function saveArchive(env, submitted) {
  const challenges = submitted?.challenges
  const referencedImages = validateChallenges(challenges)
  const oldChallenges = await loadSourceChallenges(env)
  const oldImageNames = new Set(oldChallenges.filter((row) => typeof row?.image === 'string' && row.image.startsWith('images/')).map((row) => row.image.slice('images/'.length)))
  const uploads = submitted?.uploads
  if (!Array.isArray(uploads) || uploads.length > MAX_UPLOADS) throw new Error(`Upload no more than ${MAX_UPLOADS} images per save.`)
  const uploadByName = new Map()
  let totalBytes = 0
  for (const upload of uploads) {
    if (!upload || typeof upload.name !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,159}\.(?:jpe?g|png|webp)$/i.test(upload.name)) throw new Error('Image filenames may contain only letters, numbers, dots, underscores, and hyphens, with a JPG, PNG, or WebP extension.')
    if (uploadByName.has(upload.name)) throw new Error(`Image “${upload.name}” was uploaded more than once.`)
    const bytes = decodeBase64(upload.base64)
    totalBytes += bytes.byteLength
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES) throw new Error('The total image upload per save must be 24 MB or smaller.')
    if (!isAllowedImage(bytes, upload.name)) throw new Error(`Image “${upload.name}” does not match its file extension or is not a supported image.`)
    uploadByName.set(upload.name, upload.base64)
  }
  for (const name of referencedImages) {
    if (!oldImageNames.has(name) && !uploadByName.has(name)) throw new Error(`Upload “${name}” before referencing it in a challenge.`)
  }
  for (const name of uploadByName.keys()) {
    if (!referencedImages.has(name)) throw new Error(`Uploaded image “${name}” is not used by any challenge.`)
  }

  const jsonContent = `${JSON.stringify(challenges, null, 2)}\n`
  const deletedImages = [...oldImageNames].filter((name) => !referencedImages.has(name))
  const sourceMutations = [{ path: JSON_PATH, content: jsonContent, encoding: 'utf-8' }]
  const pagesMutations = [{ path: PAGES_JSON_PATH, content: jsonContent, encoding: 'utf-8' }]
  for (const [name, base64] of uploadByName) {
    sourceMutations.push({ path: `${IMAGE_PREFIX}${name}`, content: base64, encoding: 'base64' })
    pagesMutations.push({ path: `${PAGES_IMAGE_PREFIX}${name}`, content: base64, encoding: 'base64' })
  }
  for (const name of deletedImages) {
    sourceMutations.push({ path: `${IMAGE_PREFIX}${name}`, remove: true })
    pagesMutations.push({ path: `${PAGES_IMAGE_PREFIX}${name}`, remove: true })
  }
  const timestamp = new Date().toISOString().slice(0, 10)
  await commitBranch(env, env.SOURCE_BRANCH || 'main', sourceMutations, `Admin: update challenge archive (${timestamp})`)
  await commitBranch(env, env.PAGES_BRANCH || 'gh-pages', pagesMutations, `Admin: publish challenge archive (${timestamp})`)
  return { count: challenges.length, uploaded: uploadByName.size, removedImages: deletedImages.length }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const path = new URL(request.url).pathname
    if (request.method === 'OPTIONS') {
      const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)
      if (origin && !allowedOrigins.includes(origin)) return response({ error: 'Origin not allowed.' }, 403, '', env)
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
      } })
    }
    if (origin && !(env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).includes(origin)) {
      return response({ error: 'Origin not allowed.' }, 403, '', env)
    }
    if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16 || !env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET.length < 32 || !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
      return response({ error: 'Admin API is not fully configured.' }, 503, origin, env)
    }

    if (request.method === 'POST' && path === '/api/admin/login') {
      try {
        if (env.LOGIN_LIMITER) {
          const limit = await env.LOGIN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' })
          if (!limit.success) return response({ error: 'Too many sign-in attempts. Wait a minute and try again.' }, 429, origin, env)
        }
        const body = await readJsonBody(request, 8 * 1024)
        const validUsername = await constantTimeEqual(String(body?.username ?? ''), env.ADMIN_USERNAME)
        const validPassword = await constantTimeEqual(String(body?.password ?? ''), env.ADMIN_PASSWORD)
        if (!validUsername || !validPassword) return response({ error: 'Username or password is incorrect.' }, 401, origin, env)
        return response({ token: await createToken(env.ADMIN_USERNAME, env.ADMIN_SESSION_SECRET), expiresIn: TOKEN_LIFETIME_SECONDS }, 200, origin, env)
      } catch (error) {
        return response({ error: error instanceof Error ? error.message : 'Login failed.' }, 400, origin, env)
      }
    }

    if (request.method === 'GET' && path === '/api/admin/challenges') {
      if (!await verifyToken(getBearerToken(request), env)) return response({ error: 'Admin session expired. Please sign in again.' }, 401, origin, env)
      try {
        return response({ challenges: await loadSourceChallenges(env) }, 200, origin, env)
      } catch (error) {
        return response({ error: error instanceof Error ? error.message : 'Could not load challenges.' }, 502, origin, env)
      }
    }

    if (request.method === 'PUT' && path === '/api/admin/challenges') {
      if (!await verifyToken(getBearerToken(request), env)) return response({ error: 'Admin session expired. Please sign in again.' }, 401, origin, env)
      try {
        const body = await readJsonBody(request)
        return response({ saved: await saveArchive(env, body) }, 200, origin, env)
      } catch (error) {
        return response({ error: error instanceof Error ? error.message : 'Could not save the challenge archive.' }, 400, origin, env)
      }
    }

    return response({ error: 'Not found.' }, 404, origin, env)
  },
}
