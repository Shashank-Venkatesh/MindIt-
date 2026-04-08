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
  'passage',
  'passages',
  'project',
  'rag',
  'retrieval',
  'our',
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

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
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

function splitLongPassage(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean)

  if (sentences.length <= 2) {
    return [text]
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

function splitIntoPassageTexts(inputText) {
  const normalized = inputText.replace(/\r\n/g, '\n').trim()

  if (!normalized) {
    return []
  }

  const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
  const passages = []

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)

    if (lines.length === 0) {
      continue
    }

    const bulletOnly = lines.every((line) => /^[>*-]\s*/.test(line) || /^\d+\s*[).:-]\s*/.test(line))

    if (bulletOnly) {
      for (const line of lines) {
        const cleaned = stripListMarker(line)
        if (cleaned) {
          passages.push(cleaned)
        }
      }
      continue
    }

    if (lines.length > 1 && isHeadingLine(lines[0])) {
      const heading = normalizeWhitespace(lines[0].replace(/[.:\-]+$/g, ''))
      const body = normalizeWhitespace(lines.slice(1).join(' '))
      passages.push(body ? `${heading}: ${body}` : heading)
      continue
    }

    const joined = normalizeWhitespace(lines.join(' '))

    if (joined.length > 320) {
      passages.push(...splitLongPassage(joined))
      continue
    }

    passages.push(joined)
  }

  return dedupePreserveOrder(passages.filter(Boolean))
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

function cosineSimilarity(leftVector, rightVector) {
  let total = 0

  for (let index = 0; index < EMBEDDING_DIMENSION; index += 1) {
    total += (leftVector[index] || 0) * (rightVector[index] || 0)
  }

  return Number(total.toFixed(6))
}

function computeIdfMap(passages) {
  const documentFrequency = new Map()

  for (const passage of passages) {
    for (const token of new Set(passage.tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)
    }
  }

  const totalDocuments = Math.max(passages.length, 1)
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

function buildPassages(inputText) {
  const passageTexts = splitIntoPassageTexts(inputText)

  return passageTexts.map((text, index) => ({
    id: `passage-${index + 1}`,
    index,
    text,
    tokens: tokenize(text),
    embedding: null,
    isHeading: isHeadingLine(text),
  }))
}

function computeFrequency(passages) {
  const frequencyMap = new Map()

  for (const passage of passages) {
    for (const token of passage.tokens) {
      frequencyMap.set(token, (frequencyMap.get(token) || 0) + 1)
    }
  }

  return frequencyMap
}

function getTopTokens(frequencyMap, limit = 6) {
  return [...frequencyMap.entries()]
    .sort((leftEntry, rightEntry) => {
      const [leftToken, leftCount] = leftEntry
      const [rightToken, rightCount] = rightEntry

      if (leftCount !== rightCount) {
        return rightCount - leftCount
      }

      return rightToken.length - leftToken.length
    })
    .slice(0, limit)
    .map(([token]) => token)
}

function buildRetrievalQuery(passages, frequencyMap) {
  const headingCandidate = passages.find((passage) => passage.isHeading)
  const topTokens = getTopTokens(frequencyMap, 6)

  const queryParts = []

  if (headingCandidate) {
    queryParts.push(stripListMarker(headingCandidate.text.replace(/[.]+$/g, '').replace(/[:\-]$/, '')))
  }

  if (topTokens.length > 0) {
    queryParts.push(topTokens.join(' '))
  }

  return normalizeWhitespace(queryParts.join(' ')) || 'important note ideas'
}

function buildSummaryParagraph(selectedSources, title, queryTokens) {
  const focusText = queryTokens.length > 0 ? formatTermList(queryTokens.slice(0, 3)) : 'the strongest retrieved ideas'
  const leadSource = selectedSources[0]
  const supportSource = selectedSources[1]
  const sentences = []

  if (title && title !== 'RAG Note Draft') {
    sentences.push(`This draft centers on ${title}.`)
  } else {
    sentences.push(`This draft stays grounded in the strongest retrieved passages.`)
  }

  sentences.push(`The focus stays on ${focusText}.`)

  if (leadSource) {
    sentences.push('The first passage establishes the retrieval direction.')
  }

  if (supportSource) {
    sentences.push('The second passage keeps the note tied to the decision and tradeoff.')
  }

  if (selectedSources.length > 2) {
    sentences.push('The remaining passages add supporting evidence from the source text.')
  }

  return normalizeWhitespace(sentences.join(' '))
}

function buildTakeawayLines(selectedSources, queryTokens) {
  const takeaways = []

  if (selectedSources[0]) {
    takeaways.push('Lead with the main retrieved idea before drafting the final note.')
  }

  if (selectedSources[1]) {
    takeaways.push('Reinforce the note with the strongest supporting passage.')
  }

  if (selectedSources[2]) {
    takeaways.push('Keep the final note anchored to the original source claims.')
  }

  if (queryTokens.length > 0) {
    takeaways.push(`Stay focused on ${formatTermList(queryTokens.slice(0, 4))}.`)
  }

  return dedupePreserveOrder(takeaways).slice(0, 4)
}

function scorePassage(passage, queryEmbedding, frequencyMap) {
  const similarity = cosineSimilarity(passage.embedding, queryEmbedding)
  const keywordWeight = passage.tokens.reduce((total, token) => total + (frequencyMap.get(token) || 0), 0)
  const density = keywordWeight / Math.max(passage.tokens.length, 1)
  const headingBonus = passage.isHeading ? 0.15 : 0
  const lengthBonus = passage.text.length > 180 ? 0.04 : 0.02

  return Number((similarity * 0.75 + density * 0.18 + headingBonus + lengthBonus).toFixed(6))
}

function rankPassages(passages, queryEmbedding, frequencyMap) {
  return passages
    .map((passage) => ({
      passage,
      score: scorePassage(passage, queryEmbedding, frequencyMap),
    }))
    .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
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

function selectSources(rankedPassages, limit = SOURCE_LIMIT) {
  const selected = []

  for (const candidate of rankedPassages) {
    if (selected.length === 0) {
      selected.push(candidate)
      continue
    }

    const tooSimilar = selected.some((entry) => {
      const passageSimilarity = cosineSimilarity(entry.passage.embedding, candidate.passage.embedding)
      const tokenOverlap = lexicalOverlapScore(entry.passage.tokens, candidate.passage.tokens)
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
    for (const candidate of rankedPassages) {
      if (selected.some((entry) => entry.passage.id === candidate.passage.id)) {
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

function stripLeadingLabel(text, label) {
  if (!label) {
    return text
  }

  const cleanedLabel = normalizeWhitespace(label).replace(/[.]+$/g, '')

  if (!cleanedLabel) {
    return text
  }

  const stripped = text.replace(new RegExp(`^${cleanedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-]?\\s*`, 'i'), '')
  return normalizeWhitespace(stripped) || text
}

function buildDraftLines(selectedSources, title, queryTokens) {
  const lines = []

  if (selectedSources[0]) {
    lines.push(`Core note: ${toCompactSnippet(stripIntroLabel(stripLeadingLabel(selectedSources[0].passage.text, title)), 20)}`)
  }

  if (selectedSources[1]) {
    lines.push(`Supporting detail: ${toCompactSnippet(stripIntroLabel(stripLeadingLabel(selectedSources[1].passage.text, title)), 20)}`)
  }

  if (selectedSources[2]) {
    lines.push(`Additional evidence: ${toCompactSnippet(stripIntroLabel(stripLeadingLabel(selectedSources[2].passage.text, title)), 20)}`)
  }

  if (queryTokens.length > 0) {
    lines.push(`Focus terms: ${queryTokens.slice(0, 4).join(', ')}`)
  }

  return dedupePreserveOrder(lines).slice(0, 4)
}

function buildTitle(passages) {
  const headingCandidate = passages.find((passage) => passage.isHeading)

  if (headingCandidate) {
    return titleCase(stripListMarker(headingCandidate.text.replace(/[.]+$/g, '').replace(/[:\-]$/, '')))
  }

  return 'RAG Note Draft'
}

function buildFollowUps(selectedSources, queryTokens) {
  const followUps = []

  if (selectedSources.length < 3) {
    followUps.push('Add one more source passage so the draft has more evidence to retrieve from.')
  }

  if (queryTokens.length > 0) {
    followUps.push(`What extra detail should be captured about ${queryTokens[0]}?`)
  }

  if (selectedSources.length > 0) {
    followUps.push('Which source passage should become the final takeaway sentence?')
  }

  return dedupePreserveOrder(followUps).slice(0, 3)
}

function toCompactSnippet(text, maxWords = 14) {
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

function processNotes(inputText) {
  const passages = buildPassages(inputText)

  if (passages.length === 0) {
    return {
      rag: {
        title: 'RAG Note Draft',
        overview: 'No note content was provided.',
        draft: [],
        sources: [],
        followUps: [],
      },
    }
  }

  const frequencyMap = computeFrequency(passages)
  const idfMap = computeIdfMap(passages)

  for (const passage of passages) {
    passage.embedding = buildEmbedding(passage.text, idfMap)
  }

  const query = buildRetrievalQuery(passages, frequencyMap)
  const queryEmbedding = buildEmbedding(query, idfMap)
  const rankedPassages = rankPassages(passages, queryEmbedding, frequencyMap)
  const selectedSources = selectSources(rankedPassages, SOURCE_LIMIT)
  const queryTokens = getTopTokens(frequencyMap, 4)
  const title = buildTitle(passages)
  const summary = buildSummaryParagraph(selectedSources, title, queryTokens)
  const takeaways = buildTakeawayLines(selectedSources, queryTokens)
  const draft = buildDraftLines(selectedSources, title, queryTokens)

  return {
    rag: {
      title,
      overview: `Retrieved ${selectedSources.length} source passage${selectedSources.length === 1 ? '' : 's'} from ${passages.length} passage${passages.length === 1 ? '' : 's'}.`,
      summary,
      takeaways,
      draft,
      sources: selectedSources.map(({ passage, score }) => ({
        id: passage.id,
        score: Number(score.toFixed(3)),
        excerpt: toCompactSnippet(passage.text, 20),
      })),
      followUps: buildFollowUps(selectedSources, queryTokens),
    },
  }
}

module.exports = {
  processNotes,
}