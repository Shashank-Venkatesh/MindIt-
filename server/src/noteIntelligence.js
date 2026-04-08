const STOP_WORDS = new Set([
  'a',
  'about',
  'after',
  'all',
  'also',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'more',
  'most',
  'not',
  'of',
  'on',
  'or',
  'our',
  'passage',
  'passages',
  'project',
  'note',
  'notes',
  'draft',
  'source',
  'sources',
  'briefing',
  'should',
  'so',
  'some',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'to',
  'too',
  'under',
  'up',
  'use',
  'uses',
  'using',
  'very',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'why',
  'with',
  'would',
  'you',
  'your',
])

const EMBEDDING_DIMENSION = 48
const SOURCE_LIMIT = 4
const TOPIC_SIMILARITY_THRESHOLD = 0.62

function normalizeToken(word) {
  if (!word) {
    return ''
  }

  let token = word.toLowerCase().trim()
  token = token.replace(/^'+|'+$/g, '')

  if (token.endsWith('ies') && token.length > 4) {
    return `${token.slice(0, -3)}y`
  }

  if (token.endsWith('s') && token.length > 3 && !token.endsWith('ss')) {
    return token.slice(0, -1)
  }

  return token
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, ' ')
    .split(/\s+/)
    .flatMap((word) => word.split(/[/-]/g))
    .map((word) => normalizeToken(word))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function dedupePreserveOrder(items) {
  const seen = new Set()
  const result = []

  for (const item of items) {
    if (seen.has(item)) {
      continue
    }

    seen.add(item)
    result.push(item)
  }

  return result
}

function titleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && /[A-Z]/.test(word) && word.length <= 5) {
        return word
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function formatTermList(terms) {
  if (terms.length === 0) {
    return ''
  }

  if (terms.length === 1) {
    return terms[0]
  }

  if (terms.length === 2) {
    return `${terms[0]} and ${terms[1]}`
  }

  return `${terms.slice(0, -1).join(', ')}, and ${terms[terms.length - 1]}`
}

function stripListMarker(text) {
  return text
    .replace(/^[>*-]\s*/, '')
    .replace(/^\d+\s*[).:-]\s*/, '')
    .trim()
}

function stripIntroLabel(text) {
  const colonIndex = text.indexOf(':')

  if (colonIndex === -1) {
    return text
  }

  const prefix = normalizeWhitespace(text.slice(0, colonIndex))
  const suffix = normalizeWhitespace(text.slice(colonIndex + 1))

  if (!suffix || prefix.length > 72) {
    return text
  }

  const prefixWords = prefix.split(/\s+/).filter(Boolean)

  if (prefixWords.length === 0 || prefixWords.length > 5) {
    return text
  }

  return suffix
}

function stripLeadingLabel(text, label) {
  if (!label) {
    return text
  }

  const cleanedLabel = normalizeWhitespace(label).replace(/[.]+$/g, '')

  if (!cleanedLabel) {
    return text
  }

  const pattern = new RegExp(
    `^${cleanedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*[:\-]?\s*`,
    'i',
  )

  const stripped = text.replace(pattern, '')
  return normalizeWhitespace(stripped) || text
}

function isBulletLine(text) {
  return /^[>*-]\s*/.test(text) || /^\d+\s*[).:-]\s*/.test(text)
}

function isHeadingLine(text) {
  const cleaned = normalizeWhitespace(text).replace(/[.]+$/g, '')

  if (!cleaned || cleaned.length > 72) {
    return false
  }

  if (/[:\-]$/.test(cleaned)) {
    return true
  }

  const words = cleaned.split(/\s+/)

  if (words.length > 6) {
    return false
  }

  return /^[A-Z][A-Za-z0-9\s/+&-]*$/.test(cleaned) && !/[.!?]$/.test(cleaned)
}

function countSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean).length
}

function splitLongPassage(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean)

  if (sentences.length <= 2) {
    return [normalizeWhitespace(text)]
  }

  const passages = []
  let current = []

  for (const sentence of sentences) {
    current.push(sentence)

    if (current.length === 2) {
      passages.push(current.join(' '))
      current = []
    }
  }

  if (current.length > 0) {
    passages.push(current.join(' '))
  }

  return passages
}

function clipText(text, maxWords = 16) {
  const cleaned = normalizeWhitespace(text)
    .replace(/[.]+$/g, '')
    .replace(/^[-*]\s*/, '')
    .replace(/^\d+\s*[).:-]\s*/, '')

  if (!cleaned) {
    return ''
  }

  const words = cleaned.split(' ')

  if (words.length <= maxWords) {
    return cleaned
  }

  return `${words.slice(0, maxWords).join(' ')}...`
}

function pushChunkSpec(specs, seen, kind, text, heading = '') {
  const cleanedText = normalizeWhitespace(text)
  const cleanedHeading = normalizeWhitespace(heading)

  if (!cleanedText) {
    return
  }

  const key = `${kind}|${cleanedHeading}|${cleanedText}`

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  specs.push({ kind, heading: cleanedHeading, text: cleanedText })
}

function splitIntoSemanticChunks(inputText) {
  const normalized = inputText.replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return []
  }

  const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  const chunkSpecs = []
  const seen = new Set()

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)

    if (lines.length === 0) {
      continue
    }

    if (lines.every((line) => isBulletLine(line))) {
      for (const line of lines) {
        pushChunkSpec(chunkSpecs, seen, 'bullet', stripListMarker(line))
      }

      continue
    }

    if (lines.length > 1 && isHeadingLine(lines[0])) {
      const heading = normalizeWhitespace(lines[0].replace(/[.:-]+$/g, ''))
      const body = normalizeWhitespace(lines.slice(1).join(' '))

      if (!body) {
        pushChunkSpec(chunkSpecs, seen, 'heading', heading, heading)
        continue
      }

      if (body.length > 360) {
        for (const part of splitLongPassage(body)) {
          pushChunkSpec(chunkSpecs, seen, 'section', part, heading)
        }
      } else {
        pushChunkSpec(chunkSpecs, seen, 'section', body, heading)
      }

      continue
    }

    const joined = normalizeWhitespace(lines.join(' '))

    if (joined.length > 360) {
      for (const part of splitLongPassage(joined)) {
        pushChunkSpec(chunkSpecs, seen, 'sentence-group', part)
      }
    } else {
      pushChunkSpec(chunkSpecs, seen, 'paragraph', joined)
    }
  }

  return chunkSpecs.map((spec, index) => ({
    id: `chunk-${index + 1}`,
    index,
    kind: spec.kind,
    heading: spec.heading,
    label: spec.heading ? titleCase(spec.heading) : `Chunk ${index + 1}`,
    text: spec.text,
    tokens: tokenize(spec.text),
    sentenceCount: countSentences(spec.text),
    charCount: spec.text.length,
    embedding: [],
    topicId: '',
    topicLabel: '',
  }))
}

function computeFrequency(chunks) {
  const frequencyMap = new Map()

  for (const chunk of chunks) {
    for (const token of chunk.tokens) {
      frequencyMap.set(token, (frequencyMap.get(token) || 0) + 1)
    }
  }

  return frequencyMap
}

function getTopTokens(frequencyMap, limit = 6) {
  return [...frequencyMap.entries()]
    .sort((leftEntry, rightEntry) => {
      const [, leftCount] = leftEntry
      const [, rightCount] = rightEntry

      if (leftCount !== rightCount) {
        return rightCount - leftCount
      }

      return rightEntry[0].length - leftEntry[0].length
    })
    .slice(0, limit)
    .map(([token]) => token)
}

function hashString(value, seed = 0) {
  let hash = 2166136261 ^ seed

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  hash += hash << 13
  hash ^= hash >>> 7
  hash += hash << 3
  hash ^= hash >>> 17
  hash += hash << 5

  return hash >>> 0
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((total, value) => total + value * value, 0))

  if (!magnitude) {
    return vector
  }

  return vector.map((value) => value / magnitude)
}

function averageVectors(vectors) {
  if (vectors.length === 0) {
    return Array(EMBEDDING_DIMENSION).fill(0)
  }

  const combined = Array(EMBEDDING_DIMENSION).fill(0)

  for (const vector of vectors) {
    for (let index = 0; index < EMBEDDING_DIMENSION; index += 1) {
      combined[index] += vector[index] || 0
    }
  }

  return normalizeVector(combined.map((value) => value / vectors.length))
}

function cosineSimilarity(leftVector, rightVector) {
  let total = 0

  for (let index = 0; index < EMBEDDING_DIMENSION; index += 1) {
    total += (leftVector[index] || 0) * (rightVector[index] || 0)
  }

  return Number(total.toFixed(6))
}

function computeIdfMap(chunks) {
  const documentFrequency = new Map()

  for (const chunk of chunks) {
    for (const token of new Set(chunk.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)
    }
  }

  const totalDocuments = Math.max(chunks.length, 1)
  const idfMap = new Map()

  for (const [token, count] of documentFrequency.entries()) {
    idfMap.set(token, Math.log((1 + totalDocuments) / (1 + count)) + 1)
  }

  return idfMap
}

function buildEmbedding(text, idfMap) {
  const vector = Array(EMBEDDING_DIMENSION).fill(0)
  const tokens = tokenize(text)

  if (tokens.length === 0) {
    return vector
  }

  const tokenCounts = new Map()

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1)
  }

  for (const [token, count] of tokenCounts.entries()) {
    const idf = idfMap.get(token) || 1
    const weight = (1 + Math.log(count)) * idf
    const primaryIndex = hashString(token) % EMBEDDING_DIMENSION
    const secondaryIndex = hashString(`${token}:context`) % EMBEDDING_DIMENSION
    const sign = hashString(`${token}:sign`) % 2 === 0 ? 1 : -1

    vector[primaryIndex] += weight * sign
    vector[secondaryIndex] += weight * 0.5
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const bigram = `${tokens[index]}_${tokens[index + 1]}`
    const weight = ((idfMap.get(tokens[index]) || 1) + (idfMap.get(tokens[index + 1]) || 1)) / 4
    const bucket = hashString(`bi:${bigram}`) % EMBEDDING_DIMENSION
    vector[bucket] += weight
  }

  return normalizeVector(vector)
}

function lexicalOverlapScore(leftTokens, rightTokens) {
  const leftSet = new Set(leftTokens)
  const rightSet = new Set(rightTokens)

  if (leftSet.size === 0 || rightSet.size === 0) {
    return 0
  }

  let overlap = 0

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      overlap += 1
    }
  }

  return overlap / Math.max(Math.min(leftSet.size, rightSet.size), 1)
}

function buildFocusQuery(chunks, frequencyMap, focusTerms = []) {
  const headingChunk = chunks.find((chunk) => chunk.heading)
  const topTokens = getTopTokens(frequencyMap, 6)
  const queryParts = [headingChunk?.heading || headingChunk?.label || '', ...focusTerms, ...topTokens]
    .filter(Boolean)
    .map((value) => normalizeWhitespace(value))

  return dedupePreserveOrder(queryParts).join(' ') || 'semantic note retrieval'
}

function scoreChunk(chunk, queryEmbedding, frequencyMap) {
  const similarity = cosineSimilarity(chunk.embedding, queryEmbedding)
  const keywordWeight = chunk.tokens.reduce((total, token) => total + (frequencyMap.get(token) || 0), 0)
  const density = keywordWeight / Math.max(chunk.tokens.length, 1)
  const headingBonus = chunk.heading ? 0.12 : 0
  const lengthBonus = chunk.text.length > 180 ? 0.04 : 0.02

  return Number((similarity * 0.72 + density * 0.16 + headingBonus + lengthBonus).toFixed(6))
}

function rankChunks(chunks, queryEmbedding, frequencyMap) {
  return chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryEmbedding, frequencyMap),
    }))
    .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
}

function selectSources(rankedChunks, limit = SOURCE_LIMIT) {
  const selected = []

  for (const candidate of rankedChunks) {
    if (selected.length === 0) {
      selected.push(candidate)
      continue
    }

    const tooSimilar = selected.some((entry) => {
      const passageSimilarity = cosineSimilarity(entry.chunk.embedding, candidate.chunk.embedding)
      const tokenOverlap = lexicalOverlapScore(entry.chunk.tokens, candidate.chunk.tokens)
      return passageSimilarity > 0.92 || tokenOverlap > 0.8
    })

    if (tooSimilar && selected.length >= Math.min(limit, 2)) {
      continue
    }

    selected.push(candidate)

    if (selected.length >= limit) {
      break
    }
  }

  if (selected.length < limit) {
    for (const candidate of rankedChunks) {
      if (selected.some((entry) => entry.chunk.id === candidate.chunk.id)) {
        continue
      }

      selected.push(candidate)

      if (selected.length >= limit) {
        break
      }
    }
  }

  return selected
}

function buildSummaryParagraph(selectedSources, scopeLabel, focusTerms) {
  const focusText = focusTerms.length > 0 ? formatTermList(focusTerms.slice(0, 4)) : 'the strongest source ideas'
  const sentences = []

  if (scopeLabel === 'hybrid note') {
    sentences.push('This hybrid note starts with semantic chunking, groups related passages into topic clusters, and rewrites the strongest evidence through RAG.')
    sentences.push('Each topic cluster also gets a local RAG pass so the final note stays grounded at both the document and cluster levels.')
  } else if (scopeLabel === 'topic cluster') {
    sentences.push('This topic cluster stays grounded in the strongest local passages before the rewrite.')
  } else {
    sentences.push('This note stays grounded in the strongest retrieved passages.')
  }

  sentences.push(`The focus stays on ${focusText}.`)

  if (selectedSources[0]) {
    sentences.push('The first passage establishes the retrieval direction.')
  }

  if (selectedSources[1]) {
    sentences.push('The second passage keeps the note tied to the same idea.')
  }

  if (selectedSources.length > 2) {
    sentences.push('The remaining passages add supporting evidence from the source text.')
  }

  return normalizeWhitespace(sentences.join(' '))
}

function buildTakeawayLines(selectedSources, focusTerms, scopeLabel) {
  const takeaways = []

  if (scopeLabel === 'hybrid note') {
    takeaways.push('Chunk the source first so related ideas stay isolated.')
    takeaways.push('Group the chunks into topics before writing the final note.')
    takeaways.push('Use embedding similarity to choose the strongest evidence.')
    takeaways.push('Run RAG at both the document level and the topic level.')
  } else {
    takeaways.push('Keep the local RAG pass centered on the strongest retrieved chunk.')
    takeaways.push('Avoid blending unrelated passages into the same sub-note.')
    takeaways.push('Use the cluster keywords to keep the rewrite on topic.')
  }

  if (focusTerms.length > 0) {
    takeaways.push(`Stay focused on ${formatTermList(focusTerms.slice(0, 4))}.`)
  }

  if (selectedSources.length > 0) {
    takeaways.push('Let the first source passage act as the opening anchor.')
  }

  return dedupePreserveOrder(takeaways).slice(0, 4)
}

function buildDraftLines(selectedSources, focusTerms, scopeLabel) {
  const lines = []

  if (scopeLabel === 'hybrid note') {
    if (selectedSources[0]) {
      lines.push(`Semantic chunking: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[0].chunk.text, selectedSources[0].chunk.heading || selectedSources[0].chunk.label)), 18)}`)
    }

    if (selectedSources[1]) {
      lines.push(`Topic modeling: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[1].chunk.text, selectedSources[1].chunk.heading || selectedSources[1].chunk.label)), 18)}`)
    }

    if (selectedSources[2]) {
      lines.push(`Embedding anchor: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[2].chunk.text, selectedSources[2].chunk.heading || selectedSources[2].chunk.label)), 18)}`)
    }

    if (selectedSources[3]) {
      lines.push(`RAG rewrite: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[3].chunk.text, selectedSources[3].chunk.heading || selectedSources[3].chunk.label)), 18)}`)
    }
  } else {
    if (selectedSources[0]) {
      lines.push(`Core note: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[0].chunk.text, selectedSources[0].chunk.heading || selectedSources[0].chunk.label)), 18)}`)
    }

    if (selectedSources[1]) {
      lines.push(`Supporting detail: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[1].chunk.text, selectedSources[1].chunk.heading || selectedSources[1].chunk.label)), 18)}`)
    }

    if (selectedSources[2]) {
      lines.push(`Additional evidence: ${clipText(stripIntroLabel(stripLeadingLabel(selectedSources[2].chunk.text, selectedSources[2].chunk.heading || selectedSources[2].chunk.label)), 18)}`)
    }
  }

  if (focusTerms.length > 0) {
    lines.push(`Focus terms: ${focusTerms.slice(0, 4).join(', ')}`)
  }

  return dedupePreserveOrder(lines).slice(0, 4)
}

function buildFollowUps(selectedSources, focusTerms, scopeLabel) {
  const followUps = []

  if (scopeLabel === 'hybrid note') {
    followUps.push('Should any semantic chunk be split more tightly before rewriting?')
    followUps.push('Which topic cluster should get the strongest local RAG pass?')
  } else {
    followUps.push('Should this cluster pull in another semantic chunk?')
    followUps.push('Which passage should become the opening sentence?')
  }

  if (focusTerms.length > 0) {
    followUps.push(`What extra detail should be captured about ${focusTerms[0]}?`)
  }

  if (selectedSources.length > 0) {
    followUps.push('Which source passage should become the closing takeaway?')
  }

  return dedupePreserveOrder(followUps).slice(0, 3)
}

function buildHybridTitle(chunks, scopeLabel) {
  const headingChunk = chunks.find((chunk) => chunk.heading)
  const frequencyMap = computeFrequency(chunks)
  const topTokens = getTopTokens(frequencyMap, 4)

  if (headingChunk?.heading) {
    return titleCase(headingChunk.heading)
  }

  if (topTokens.length > 0) {
    return `${titleCase(formatTermList(topTokens.slice(0, 3)))} RAG`
  }

  if (scopeLabel === 'topic cluster') {
    return 'Topic RAG Note'
  }

  return 'Hybrid RAG Note'
}

function buildRagPack(chunks, options = {}) {
  const {
    title,
    scopeLabel = 'hybrid note',
    focusTerms = [],
    sourceLimit = SOURCE_LIMIT,
  } = options

  const localChunks = chunks.map((chunk) => ({
    ...chunk,
    tokens: [...chunk.tokens],
    embedding: [],
  }))

  if (localChunks.length === 0) {
    return {
      title: title || 'Hybrid RAG Note',
      overview: `No passages were available for ${scopeLabel}.`,
      summary: '',
      takeaways: [],
      draft: [],
      sources: [],
      followUps: [],
      queryTerms: [],
    }
  }

  const frequencyMap = computeFrequency(localChunks)
  const idfMap = computeIdfMap(localChunks)

  for (const chunk of localChunks) {
    chunk.embedding = buildEmbedding(chunk.text, idfMap)
  }

  const queryTerms = dedupePreserveOrder([
    ...focusTerms,
    ...getTopTokens(frequencyMap, 6),
  ].filter(Boolean))

  const queryText = buildFocusQuery(localChunks, frequencyMap, queryTerms)
  const queryEmbedding = buildEmbedding(queryText, idfMap)
  const rankedChunks = rankChunks(localChunks, queryEmbedding, frequencyMap)
  const selectedSources = selectSources(rankedChunks, sourceLimit)

  return {
    title: title || buildHybridTitle(localChunks, scopeLabel),
    overview: `Retrieved ${selectedSources.length} source passage${selectedSources.length === 1 ? '' : 's'} from ${localChunks.length} semantic chunk${localChunks.length === 1 ? '' : 's'} for ${scopeLabel}.`,
    summary: buildSummaryParagraph(selectedSources, scopeLabel, queryTerms),
    takeaways: buildTakeawayLines(selectedSources, queryTerms, scopeLabel),
    draft: buildDraftLines(selectedSources, queryTerms, scopeLabel),
    sources: selectedSources.map(({ chunk, score }) => ({
      id: chunk.id,
      kind: chunk.kind,
      heading: chunk.heading,
      score: Number(score.toFixed(3)),
      excerpt: clipText(stripIntroLabel(stripLeadingLabel(chunk.text, chunk.heading || chunk.label)), 20),
    })),
    followUps: buildFollowUps(selectedSources, queryTerms, scopeLabel),
    queryTerms,
    queryText,
    queryEmbedding,
    rankedChunks,
  }
}

function buildTopicLabel(cluster, keywords, index) {
  if (cluster.heading) {
    return titleCase(cluster.heading)
  }

  if (keywords.length > 0) {
    return titleCase(formatTermList(keywords.slice(0, 3)))
  }

  return `Topic ${index + 1}`
}

function buildTopicSummary(cluster, keywords) {
  const focusText = keywords.length > 0 ? formatTermList(keywords.slice(0, 4)) : 'shared signals'

  if (cluster.chunks.length === 1) {
    return `This cluster keeps ${focusText} inside one semantic chunk.`
  }

  return `This cluster groups ${focusText} across ${cluster.chunks.length} semantic chunks.`
}

function clusterTopics(chunks) {
  const clusters = []

  for (const chunk of chunks) {
    let bestCluster = null
    let bestScore = 0

    for (const cluster of clusters) {
      const centroidScore = cosineSimilarity(chunk.embedding, cluster.centroid)
      const keywordOverlap = lexicalOverlapScore(chunk.tokens, cluster.keywordTokens)
      const headingMatch = cluster.heading && chunk.heading && cluster.heading === chunk.heading ? 0.15 : 0
      const score = centroidScore * 0.72 + keywordOverlap * 0.22 + headingMatch

      if (score > bestScore) {
        bestScore = score
        bestCluster = cluster
      }
    }

    if (!bestCluster || bestScore < TOPIC_SIMILARITY_THRESHOLD) {
      bestCluster = {
        id: `topic-${clusters.length + 1}`,
        chunks: [],
        centroid: Array(EMBEDDING_DIMENSION).fill(0),
        heading: chunk.heading || '',
        keywordTokens: [],
      }
      clusters.push(bestCluster)
    }

    bestCluster.chunks.push(chunk)
    if (!bestCluster.heading && chunk.heading) {
      bestCluster.heading = chunk.heading
    }
    bestCluster.centroid = averageVectors(bestCluster.chunks.map((member) => member.embedding))
    bestCluster.keywordTokens = dedupePreserveOrder([
      ...bestCluster.keywordTokens,
      ...chunk.tokens,
    ])
    chunk.topicId = bestCluster.id
  }

  return clusters.map((cluster, index) => {
    const keywordFrequency = new Map()

    for (const chunk of cluster.chunks) {
      for (const token of chunk.tokens) {
        keywordFrequency.set(token, (keywordFrequency.get(token) || 0) + 1)
      }
    }

    const keywords = getTopTokens(keywordFrequency, 5)
    const label = buildTopicLabel(cluster, keywords, index)
    const coherence = cluster.chunks.length > 0
      ? cluster.chunks.reduce((total, member) => total + cosineSimilarity(member.embedding, cluster.centroid), 0) / cluster.chunks.length
      : 0
    const rag = buildRagPack(cluster.chunks, {
      title: `${label} RAG`,
      scopeLabel: 'topic cluster',
      focusTerms: keywords,
      sourceLimit: Math.min(SOURCE_LIMIT, 3),
    })

    for (const chunk of cluster.chunks) {
      chunk.topicLabel = label
    }

    return {
      id: cluster.id,
      label,
      keywords,
      chunkIds: cluster.chunks.map((chunk) => chunk.id),
      chunkCount: cluster.chunks.length,
      coherence: Number(coherence.toFixed(3)),
      summary: buildTopicSummary(cluster, keywords),
      rag,
    }
  })
}

function buildEmbeddingReport(chunks, queryEmbedding) {
  const anchors = chunks
    .map((chunk) => {
      const localFrequency = new Map()

      for (const token of chunk.tokens) {
        localFrequency.set(token, (localFrequency.get(token) || 0) + 1)
      }

      const nearest = chunks
        .filter((otherChunk) => otherChunk.id !== chunk.id)
        .map((otherChunk) => ({
          id: otherChunk.id,
          score: Number(cosineSimilarity(chunk.embedding, otherChunk.embedding).toFixed(3)),
        }))
        .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
        .slice(0, 2)

      return {
        id: chunk.id,
        label: chunk.label,
        score: Number(cosineSimilarity(chunk.embedding, queryEmbedding).toFixed(3)),
        keywords: getTopTokens(localFrequency, 4),
        nearest,
      }
    })
    .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)

  const similarityPairs = []

  for (let leftIndex = 0; leftIndex < chunks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < chunks.length; rightIndex += 1) {
      const leftChunk = chunks[leftIndex]
      const rightChunk = chunks[rightIndex]
      const score = Number(cosineSimilarity(leftChunk.embedding, rightChunk.embedding).toFixed(3))

      if (score < 0.45) {
        continue
      }

      similarityPairs.push({
        leftId: leftChunk.id,
        rightId: rightChunk.id,
        score,
      })
    }
  }

  similarityPairs.sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)

  return {
    anchors,
    pairs: similarityPairs.slice(0, 6),
  }
}

function emptyResult() {
  return {
    pipeline: {
      overview: 'No note content was provided.',
      chunkCount: 0,
      topicCount: 0,
      embeddingDimension: EMBEDDING_DIMENSION,
    },
    semantic: {
      overview: 'No semantic chunks were created.',
      chunks: [],
    },
    topics: {
      overview: 'No topic clusters were created.',
      clusters: [],
    },
    embeddings: {
      overview: 'No embeddings were generated.',
      dimension: EMBEDDING_DIMENSION,
      anchors: [],
      pairs: [],
      queryTerms: [],
    },
    rag: {
      title: 'Hybrid RAG Note',
      overview: 'No note content was provided.',
      summary: '',
      takeaways: [],
      draft: [],
      sources: [],
      followUps: [],
      topicRags: [],
    },
  }
}

function processNotes(inputText) {
  const chunks = splitIntoSemanticChunks(inputText)

  if (chunks.length === 0) {
    return emptyResult()
  }

  const frequencyMap = computeFrequency(chunks)
  const idfMap = computeIdfMap(chunks)

  for (const chunk of chunks) {
    chunk.embedding = buildEmbedding(chunk.text, idfMap)
  }

  const mainQueryTerms = getTopTokens(frequencyMap, 6)
  const mainQueryText = buildFocusQuery(chunks, frequencyMap, mainQueryTerms)
  const mainQueryEmbedding = buildEmbedding(mainQueryText, idfMap)
  const rankedChunks = rankChunks(chunks, mainQueryEmbedding, frequencyMap)
  const selectedTopics = clusterTopics(chunks)
  const semanticChunks = chunks.map((chunk) => ({
    id: chunk.id,
    index: chunk.index,
    kind: chunk.kind,
    label: chunk.label,
    heading: chunk.heading,
    text: chunk.text,
    tokenCount: chunk.tokens.length,
    sentenceCount: chunk.sentenceCount,
    keywords: getTopTokens(new Map(chunk.tokens.map((token) => [token, (frequencyMap.get(token) || 0)])), 4),
    embeddingScore: Number((rankedChunks.find((entry) => entry.chunk.id === chunk.id)?.score || 0).toFixed(3)),
    topicId: chunk.topicId,
    topicLabel: chunk.topicLabel,
  }))
  const topicLookup = new Map(selectedTopics.map((topic) => [topic.id, topic.label]))
  const rag = buildRagPack(chunks, {
    title: buildHybridTitle(chunks, 'hybrid note'),
    scopeLabel: 'hybrid note',
    focusTerms: mainQueryTerms,
    sourceLimit: SOURCE_LIMIT,
  })
  const embeddings = buildEmbeddingReport(chunks, mainQueryEmbedding)

  return {
    pipeline: {
      overview: `Split the note into ${chunks.length} semantic chunk${chunks.length === 1 ? '' : 's'}, grouped them into ${selectedTopics.length} topic cluster${selectedTopics.length === 1 ? '' : 's'}, and ran a local RAG pass inside each cluster.`,
      chunkCount: chunks.length,
      topicCount: selectedTopics.length,
      embeddingDimension: EMBEDDING_DIMENSION,
    },
    semantic: {
      overview: `Semantic chunking produced ${chunks.length} chunk${chunks.length === 1 ? '' : 's'} from the input note.`,
      chunks: semanticChunks,
    },
    topics: {
      overview: `Topic modeling grouped the chunks into ${selectedTopics.length} cluster${selectedTopics.length === 1 ? '' : 's'} with nested RAG drafts.`,
      clusters: selectedTopics.map((topic) => ({
        ...topic,
        label: topicLookup.get(topic.id) || topic.label,
      })),
    },
    embeddings: {
      overview: `Hashed-IDF embeddings compare each semantic chunk in a ${EMBEDDING_DIMENSION}-dimensional space.`,
      dimension: EMBEDDING_DIMENSION,
      queryTerms: mainQueryTerms,
      anchors: embeddings.anchors,
      pairs: embeddings.pairs,
    },
    rag: {
      ...rag,
      topicRags: selectedTopics.map((topic) => ({
        id: topic.id,
        title: topic.label,
        summary: topic.rag.summary,
        takeaways: topic.rag.takeaways,
        draft: topic.rag.draft,
        sources: topic.rag.sources,
      })),
    },
  }
}

module.exports = {
  processNotes,
}
