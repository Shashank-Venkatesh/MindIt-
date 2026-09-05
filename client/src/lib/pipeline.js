export function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

// Common words ignored when comparing paragraphs for paraphrase detection.
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'let', 'may', 'own', 'too', 'use', 'who', 'why', 'this', 'that',
  'with', 'from', 'your', 'have', 'more', 'will', 'they', 'them', 'were',
  'been', 'their', 'what', 'when', 'which', 'would', 'there', 'these',
  'those', 'into', 'than', 'then', 'also', 'should', 'some', 'such', 'very',
  'about', 'after', 'before', 'between', 'both', 'each', 'other', 'over',
  'under', 'most', 'only', 'any', 'all', 'note', 'notes', 'source', 'sources',
  'passage', 'passages', 'cluster', 'clusters', 'topic', 'topics',
])

export function pluralizeCount(count, label) {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

export function formatTermList(terms) {
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

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTimestamp(ms) {
  const date = new Date(ms)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function buildStudyNotesModel(result) {
  const semanticChunks = result?.semantic?.chunks || []
  const topicClusters = result?.topics?.clusters || []
  const rag = result?.rag || {}
  const pipeline = result?.pipeline || {}
  const semantic = result?.semantic || {}
  const topics = result?.topics || {}
  const embeddings = result?.embeddings || {}

  const sections = []
  const seen = new Set()
  // Track normalized paragraph text already shown so paraphrased lines that
  // repeat the same idea (same meaning, different wording) are omitted from
  // the summary once they have been covered by an earlier section.
  const seenParagraphs = new Set()

  // Lightweight token set used to catch near-duplicate paragraphs: two
  // paragraphs are treated as paraphrases when they share most of their
  // meaningful tokens, even if the wording differs.
  const tokenSet = (text) => {
    const tokens = (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
      (t) => !STOP_WORDS.has(t)
    )
    return new Set(tokens)
  }

  const isParaphrase = (text) => {
    const key = normalizeWhitespace(text || '').toLowerCase()
    if (!key) {
      return true
    }
    if (seenParagraphs.has(key)) {
      return true
    }
    const tokens = tokenSet(text)
    if (tokens.size === 0) {
      return false
    }
    for (const prev of seenParagraphs) {
      const prevTokens = tokenSet(prev)
      if (prevTokens.size === 0) {
        continue
      }
      const overlap = [...tokens].filter((t) => prevTokens.has(t)).length
      const ratio = overlap / Math.min(tokens.size, prevTokens.size)
      if (ratio >= 0.8) {
        return true
      }
    }
    return false
  }

  const addSection = (title, paragraphs) => {
    const cleanTitle = normalizeWhitespace(title || '')
    const cleanParagraphs = paragraphs
      .map((paragraph) => normalizeWhitespace(paragraph || ''))
      .filter(Boolean)
      // Omit paraphrased paragraphs that repeat an idea already covered.
      .filter((paragraph) => {
        if (isParaphrase(paragraph)) {
          return false
        }
        seenParagraphs.add(paragraph.toLowerCase())
        return true
      })

    if (cleanParagraphs.length === 0) {
      return
    }

    const key = `${cleanTitle}::${cleanParagraphs.join('||')}`

    if (seen.has(key)) {
      return
    }

    seen.add(key)
    sections.push({
      id: key,
      title: cleanTitle || 'Note',
      paragraphs: cleanParagraphs,
    })
  }

  const chunkCount = pipeline.chunkCount ?? semanticChunks.length
  const topicCount = pipeline.topicCount ?? topicClusters.length
  const embeddingDimension = pipeline.embeddingDimension ?? embeddings?.dimension ?? 0

  addSection('Big picture', [
    rag.summary || 'This note stays grounded in the strongest retrieved passages.',
    chunkCount > 0
      ? `This run starts from ${pluralizeCount(chunkCount, 'semantic chunk')}${topicCount > 0 ? ` and organizes them into ${pluralizeCount(topicCount, 'topic cluster')}.` : '.'}`
      : '',
  ])

  addSection('How it works', [
    semantic.overview || '',
    topics.overview || '',
    embeddings.overview || '',
    embeddingDimension > 0
      ? `The embeddings live in a ${embeddingDimension}-dimensional space, which helps the note compare passages without losing the shape of the source material.`
      : '',
  ])

  if (topicClusters.length > 0) {
    topicClusters.forEach((topic, index) => {
      const keywordText = topic.keywords?.length ? formatTermList(topic.keywords.slice(0, 3)) : ''
      const draftAnchor = topic.rag?.draft?.[0] || topic.rag?.takeaways?.[0] || ''

      addSection(topic.label || `Topic ${index + 1}`, [
        topic.rag?.summary || topic.summary || '',
        keywordText ? `The local keywords are ${keywordText}.` : '',
        draftAnchor ? `A useful rewrite anchor is: ${draftAnchor}.` : '',
      ])
    })
  } else if (semanticChunks.length > 0) {
    semanticChunks.forEach((chunk, index) => {
      addSection(chunk.label || `Note ${index + 1}`, [
        chunk.text || '',
        chunk.topicLabel ? `It belongs with ${chunk.topicLabel}.` : '',
      ])
    })
  }

  const evidenceHeads = (rag.sources || [])
    .map((source) => normalizeWhitespace(source.heading || source.kind || ''))
    .filter(Boolean)

  addSection('Evidence anchors', [
    evidenceHeads.length > 0 ? `The strongest anchors are ${formatTermList(evidenceHeads.slice(0, 4))}.` : '',
    evidenceHeads.length > 0
      ? 'They keep the summary tied to the source material instead of turning it into a generic recap.'
      : '',
  ])

  addSection('What to remember', [
    rag.takeaways?.length ? rag.takeaways.join(' ') : '',
    rag.followUps?.length
      ? 'If the note still feels thin, split the cluster tighter and add one more source passage before rewriting.'
      : '',
  ])

  return {
    title: 'Study notes',
    overview: normalizeWhitespace([
      chunkCount > 0 ? `Built from ${pluralizeCount(chunkCount, 'semantic chunk')}.` : '',
      topicCount > 0 ? `Grouped into ${pluralizeCount(topicCount, 'topic cluster')}.` : '',
      'Written as one page so the main ideas can be reviewed without going back to the pasted source.',
    ].filter(Boolean).join(' ')),
    sections,
  }
}

export function buildMindMapModel(result) {
  const clusters = result?.topics?.clusters || []

  return clusters.map((cluster, index) => ({
    id: cluster.id || `topic-${index}`,
    label: cluster.label || `Topic ${index + 1}`,
    keywords: (cluster.keywords || []).slice(0, 3),
  }))
}
