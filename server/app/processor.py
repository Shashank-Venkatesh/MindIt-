import re
import math
from typing import List, Dict, Any, Set, Tuple

STOP_WORDS = {
    'a', 'about', 'after', 'all', 'also', 'an', 'and', 'are', 'as', 'at', 'be',
    'because', 'been', 'before', 'between', 'both', 'but', 'by', 'can', 'could',
    'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'if', 'in',
    'into', 'is', 'it', 'its', 'more', 'most', 'not', 'of', 'on', 'or', 'our',
    'passage', 'passages', 'project', 'note', 'notes', 'draft', 'source',
    'sources', 'briefing', 'should', 'so', 'some', 'than', 'that', 'the',
    'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'to',
    'too', 'under', 'up', 'use', 'uses', 'using', 'very', 'was', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'why', 'with', 'would',
    'you', 'your'
}

EMBEDDING_DIMENSION = 48
SOURCE_LIMIT = 4
TOPIC_SIMILARITY_THRESHOLD = 0.62
# Chunks whose embedding cosine similarity exceeds this are treated as
# paraphrases (same meaning, different wording) and only the stronger one
# is kept in the summary so repetitive content is omitted.
SEMANTIC_DEDUP_THRESHOLD = 0.78

def normalize_token(word: str) -> str:
    if not word:
        return ''

    token = word.lower().strip()
    # Remove leading and trailing single quotes
    token = re.sub(r"^'+|'+$", '', token)

    if token.endswith('ies') and len(token) > 4:
        return f"{token[:-3]}y"

    if token.endswith('s') and len(token) > 3 and not token.endswith('ss'):
        return token[:-1]

    return token

def tokenize(text: str) -> List[str]:
    # Replace non-alphanumeric, non-spaces, non-dashes/slashes with space
    cleaned = re.sub(r'[^a-z0-9\s/-]', ' ', text.lower())
    # Split by whitespace
    words = [w for w in re.split(r'\s+', cleaned) if w]
    # Split further by / or -
    split_words = []
    for word in words:
        split_words.extend(re.split(r'[/-]', word))
    
    tokens = []
    for word in split_words:
        norm = normalize_token(word)
        if len(norm) > 2 and norm not in STOP_WORDS:
            tokens.append(norm)
    return tokens

def normalize_whitespace(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()

def dedupe_preserve_order(items: list) -> list:
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result

def title_case(text: str) -> str:
    words = [w for w in re.split(r'\s+', text) if w]
    result = []
    for word in words:
        if word == word.upper() and re.search(r'[A-Z]', word) and len(word) <= 5:
            result.append(word)
        else:
            if len(word) > 0:
                result.append(word[0].upper() + word[1:].lower())
            else:
                result.append('')
    return ' '.join(result)

def format_term_list(terms: List[str]) -> str:
    if len(terms) == 0:
        return ''
    if len(terms) == 1:
        return terms[0]
    if len(terms) == 2:
        return f"{terms[0]} and {terms[1]}"
    return f"{', '.join(terms[:-1])}, and {terms[-1]}"

def strip_list_marker(text: str) -> str:
    text = re.sub(r'^[>*-]\s*', '', text)
    text = re.sub(r'^\d+\s*[).:-]\s*', '', text)
    return text.strip()

def strip_intro_label(text: str) -> str:
    colon_index = text.find(':')
    if colon_index == -1:
        return text

    prefix = normalize_whitespace(text[:colon_index])
    suffix = normalize_whitespace(text[colon_index + 1:])

    if not suffix or len(prefix) > 72:
        return text

    prefix_words = [w for w in prefix.split() if w]
    if len(prefix_words) == 0 or len(prefix_words) > 5:
        return text

    return suffix

def strip_leading_label(text: str, label: str) -> str:
    if not label:
        return text

    cleaned_label = re.sub(r'\.+$', '', normalize_whitespace(label))
    if not cleaned_label:
        return text

    # Escape special characters
    escaped_label = re.escape(cleaned_label)
    pattern = re.compile(rf"^{escaped_label}\s*[:\-]?\s*", re.IGNORECASE)

    stripped = pattern.sub('', text)
    return normalize_whitespace(stripped) or text

def is_bullet_line(text: str) -> bool:
    return bool(re.match(r'^[>*-]\s*', text)) or bool(re.match(r'^\d+\s*[).:-]\s*', text))

def is_heading_line(text: str) -> bool:
    cleaned = re.sub(r'\.+$', '', normalize_whitespace(text))
    if not cleaned or len(cleaned) > 72:
        return False

    if re.search(r'[:\-]$', cleaned):
        return True

    words = cleaned.split()
    if len(words) > 6:
        return False

    return bool(re.match(r'^[A-Z][A-Za-z0-9\s/+&-]*$', cleaned)) and not bool(re.search(r'[.!?]$', cleaned))

def count_sentences(text: str) -> int:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [normalize_whitespace(s) for s in sentences if s]
    return len([s for s in sentences if s])

def split_long_passage(text: str) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [normalize_whitespace(s) for s in sentences if s]

    if len(sentences) <= 2:
        return [normalize_whitespace(text)]

    passages = []
    current = []

    for sentence in sentences:
        current.append(sentence)
        if len(current) == 2:
            passages.append(' '.join(current))
            current = []

    if len(current) > 0:
        passages.append(' '.join(current))

    return passages

def clip_text(text: str, max_words: int = 16) -> str:
    cleaned = normalize_whitespace(text)
    cleaned = re.sub(r'\.+$', '', cleaned)
    cleaned = re.sub(r'^[-*]\s*', '', cleaned)
    cleaned = re.sub(r'^\d+\s*[).:-]\s*', '', cleaned)

    if not cleaned:
        return ''

    words = cleaned.split(' ')
    if len(words) <= max_words:
        return cleaned

    return ' '.join(words[:max_words]) + '...'

def to_compact_snippet(text: str, max_words: int = 14) -> str:
    return clip_text(text, max_words)

def push_chunk_spec(specs: List[Dict[str, str]], seen: Set[str], kind: str, text: str, heading: str = '') -> None:
    cleaned_text = normalize_whitespace(text)
    cleaned_heading = normalize_whitespace(heading)

    if not cleaned_text:
        return

    key = f"{kind}|{cleaned_heading}|{cleaned_text}"
    if key in seen:
        return

    seen.add(key)
    specs.append({'kind': kind, 'heading': cleaned_heading, 'text': cleaned_text})

def split_into_semantic_chunks(input_text: str) -> List[Dict[str, Any]]:
    normalized = input_text.replace('\r\n', '\n').strip()
    if not normalized:
        return []

    blocks = [b.strip() for b in normalized.split('\n\s*\n') if b.strip()]
    # Actually split by double newlines or similar
    blocks = [b.strip() for b in re.split(r'\n\s*\n', normalized) if b.strip()]
    
    chunk_specs = []
    seen = set()

    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if len(lines) == 0:
            continue

        if all(is_bullet_line(line) for line in lines):
            for line in lines:
                push_chunk_spec(chunk_specs, seen, 'bullet', strip_list_marker(line))
            continue

        if len(lines) > 1 and is_heading_line(lines[0]):
            heading = normalize_whitespace(re.sub(r'[.:-]+$', '', lines[0]))
            body = normalize_whitespace(' '.join(lines[1:]))

            if not body:
                push_chunk_spec(chunk_specs, seen, 'heading', heading, heading)
                continue

            if len(body) > 360:
                for part in split_long_passage(body):
                    push_chunk_spec(chunk_specs, seen, 'section', part, heading)
            else:
                push_chunk_spec(chunk_specs, seen, 'section', body, heading)
            continue

        joined = normalize_whitespace(' '.join(lines))
        if len(joined) > 360:
            for part in split_long_passage(joined):
                push_chunk_spec(chunk_specs, seen, 'sentence-group', part)
        else:
            push_chunk_spec(chunk_specs, seen, 'paragraph', joined)

    chunks = []
    for index, spec in enumerate(chunk_specs):
        chunks.append({
            'id': f"chunk-{index + 1}",
            'index': index,
            'kind': spec['kind'],
            'heading': spec['heading'],
            'label': title_case(spec['heading']) if spec['heading'] else f"Chunk {index + 1}",
            'text': spec['text'],
            'tokens': tokenize(spec['text']),
            'sentenceCount': count_sentences(spec['text']),
            'charCount': len(spec['text']),
            'embedding': [],
            'topicId': '',
            'topicLabel': ''
        })
    return chunks

def compute_frequency(chunks: List[Dict[str, Any]]) -> Dict[str, int]:
    frequency_map = {}
    for chunk in chunks:
        for token in chunk['tokens']:
            frequency_map[token] = frequency_map.get(token, 0) + 1
    return frequency_map

def get_top_tokens(frequency_map: Dict[str, int], limit: int = 6) -> List[str]:
    sorted_tokens = sorted(
        frequency_map.items(),
        key=lambda item: (-item[1], -len(item[0]))
    )
    return [token for token, _ in sorted_tokens[:limit]]

def imul(a: int, b: int) -> int:
    a = a & 0xFFFFFFFF
    b = b & 0xFFFFFFFF
    val = (a * b) & 0xFFFFFFFF
    if val >= 0x80000000:
        return val - 0x100000000
    return val

def hash_string(value: str, seed: int = 0) -> int:
    hash_val = (2166136261 ^ seed) & 0xFFFFFFFF
    if hash_val >= 0x80000000:
        hash_val -= 0x100000000

    for char in value:
        code = ord(char)
        hash_val = hash_val ^ code
        hash_val = imul(hash_val, 16777619)

    h_shift_13 = (hash_val << 13) & 0xFFFFFFFF
    hash_val = (hash_val + h_shift_13) & 0xFFFFFFFF
    if hash_val >= 0x80000000: hash_val -= 0x100000000

    unsigned_hash = hash_val & 0xFFFFFFFF
    hash_val = hash_val ^ (unsigned_hash >> 7)
    if hash_val >= 0x80000000: hash_val -= 0x100000000

    h_shift_3 = (hash_val << 3) & 0xFFFFFFFF
    hash_val = (hash_val + h_shift_3) & 0xFFFFFFFF
    if hash_val >= 0x80000000: hash_val -= 0x100000000

    unsigned_hash = hash_val & 0xFFFFFFFF
    hash_val = hash_val ^ (unsigned_hash >> 17)
    if hash_val >= 0x80000000: hash_val -= 0x100000000

    h_shift_5 = (hash_val << 5) & 0xFFFFFFFF
    hash_val = (hash_val + h_shift_5) & 0xFFFFFFFF
    if hash_val >= 0x80000000: hash_val -= 0x100000000

    return hash_val & 0xFFFFFFFF

def normalize_vector(vector: List[float]) -> List[float]:
    magnitude = math.sqrt(sum(v * v for v in vector))
    if not magnitude:
        return vector
    return [v / magnitude for v in vector]

def average_vectors(vectors: List[List[float]]) -> List[float]:
    if len(vectors) == 0:
        return [0.0] * EMBEDDING_DIMENSION

    combined = [0.0] * EMBEDDING_DIMENSION
    for vector in vectors:
        for idx in range(EMBEDDING_DIMENSION):
            combined[idx] += vector[idx] if idx < len(vector) else 0.0

    avg = [v / len(vectors) for v in combined]
    return normalize_vector(avg)

def cosine_similarity(left_vector: List[float], right_vector: List[float]) -> float:
    total = 0.0
    for idx in range(EMBEDDING_DIMENSION):
        l_val = left_vector[idx] if idx < len(left_vector) else 0.0
        r_val = right_vector[idx] if idx < len(right_vector) else 0.0
        total += l_val * r_val
    return round(total, 6)

def compute_idf_map(chunks: List[Dict[str, Any]]) -> Dict[str, float]:
    document_frequency = {}
    for chunk in chunks:
        for token in set(chunk['tokens']):
            document_frequency[token] = document_frequency.get(token, 0) + 1

    total_documents = max(len(chunks), 1)
    idf_map = {}
    for token, count in document_frequency.items():
        idf_map[token] = math.log((1 + total_documents) / (1 + count)) + 1.0
    return idf_map

def build_embedding(text: str, idf_map: Dict[str, float]) -> List[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = tokenize(text)
    if len(tokens) == 0:
        return vector

    token_counts = {}
    for token in tokens:
        token_counts[token] = token_counts.get(token, 0) + 1

    for token, count in token_counts.items():
        idf = idf_map.get(token, 1.0)
        weight = (1.0 + math.log(count)) * idf
        primary_index = hash_string(token) % EMBEDDING_DIMENSION
        secondary_index = hash_string(f"{token}:context") % EMBEDDING_DIMENSION
        sign = 1.0 if (hash_string(f"{token}:sign") % 2 == 0) else -1.0

        vector[primary_index] += weight * sign
        vector[secondary_index] += weight * 0.5

    for idx in range(len(tokens) - 1):
        bigram = f"{tokens[idx]}_{tokens[idx + 1]}"
        weight = ((idf_map.get(tokens[idx], 1.0) + idf_map.get(tokens[idx + 1], 1.0)) / 4.0)
        bucket = hash_string(f"bi:{bigram}") % EMBEDDING_DIMENSION
        vector[bucket] += weight

    return normalize_vector(vector)

def lexical_overlap_score(left_tokens: List[str], right_tokens: List[str]) -> float:
    left_set = set(left_tokens)
    right_set = set(right_tokens)

    if len(left_set) == 0 or len(right_set) == 0:
        return 0.0

    overlap = len(left_set.intersection(right_set))
    return overlap / max(min(len(left_set), len(right_set)), 1)

def build_focus_query(chunks: List[Dict[str, Any]], frequency_map: Dict[str, int], focus_terms: List[str] = None) -> str:
    if focus_terms is None:
        focus_terms = []
    heading_chunk = next((c for c in chunks if c['heading']), None)
    top_tokens = get_top_tokens(frequency_map, 6)
    
    h_text = heading_chunk['heading'] if heading_chunk else (heading_chunk['label'] if heading_chunk else '')
    query_parts = [h_text] + focus_terms + top_tokens
    query_parts = [normalize_whitespace(q) for q in query_parts if q]

    deduped = dedupe_preserve_order(query_parts)
    return ' '.join(deduped) if deduped else 'semantic note retrieval'

def score_chunk(chunk: Dict[str, Any], query_embedding: List[float], frequency_map: Dict[str, int]) -> float:
    similarity = cosine_similarity(chunk['embedding'], query_embedding)
    keyword_weight = sum(frequency_map.get(token, 0) for token in chunk['tokens'])
    density = keyword_weight / max(len(chunk['tokens']), 1)
    heading_bonus = 0.12 if chunk['heading'] else 0.0
    length_bonus = 0.04 if len(chunk['text']) > 180 else 0.02

    return round(similarity * 0.72 + density * 0.16 + heading_bonus + length_bonus, 6)

def rank_chunks(chunks: List[Dict[str, Any]], query_embedding: List[float], frequency_map: Dict[str, int]) -> List[Dict[str, Any]]:
    ranked = []
    for chunk in chunks:
        ranked.append({
            'chunk': chunk,
            'score': score_chunk(chunk, query_embedding, frequency_map)
        })
    return sorted(ranked, key=lambda entry: entry['score'], reverse=True)

def select_sources(ranked_chunks: List[Dict[str, Any]], limit: int = SOURCE_LIMIT) -> List[Dict[str, Any]]:
    selected = []

    for candidate in ranked_chunks:
        if len(selected) == 0:
            selected.append(candidate)
            continue

        too_similar = False
        for entry in selected:
            passage_similarity = cosine_similarity(entry['chunk']['embedding'], candidate['chunk']['embedding'])
            token_overlap = lexical_overlap_score(entry['chunk']['tokens'], candidate['chunk']['tokens'])
            # Drop paraphrased passages (same meaning, different wording) so
            # the summary does not repeat content that was already covered.
            if passage_similarity > SEMANTIC_DEDUP_THRESHOLD or token_overlap > 0.8:
                too_similar = True
                break

        if too_similar and len(selected) >= min(limit, 2):
            continue

        selected.append(candidate)
        if len(selected) >= limit:
            break

    if len(selected) < limit:
        for candidate in ranked_chunks:
            if any(entry['chunk']['id'] == candidate['chunk']['id'] for entry in selected):
                continue
            selected.append(candidate)
            if len(selected) >= limit:
                break

    return selected

def dedupe_paraphrased_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Drop chunks that paraphrase an earlier (higher-priority) chunk.

    Two chunks are treated as paraphrases when their embedding cosine
    similarity exceeds ``SEMANTIC_DEDUP_THRESHOLD`` — i.e. they carry the
    same meaning even when the wording differs. The first occurrence wins
    so the summary mentions each idea only once.
    """
    kept: List[Dict[str, Any]] = []
    for chunk in chunks:
        is_paraphrase = False
        for kept_chunk in kept:
            if cosine_similarity(chunk['embedding'], kept_chunk['embedding']) > SEMANTIC_DEDUP_THRESHOLD:
                is_paraphrase = True
                break
        if not is_paraphrase:
            kept.append(chunk)
    return kept

def get_selected_source_label(source: Dict[str, Any]) -> str:
    source_text = source.get('passage') or source.get('chunk')
    if not source_text:
        return ''

    label = normalize_whitespace(source_text.get('heading') or source_text.get('label') or '')
    if label:
        return label

    stripped_text = strip_intro_label(
        strip_leading_label(source_text['text'], source_text.get('heading') or source_text.get('label'))
    )
    return to_compact_snippet(stripped_text, 5)

def build_source_focus_text(selected_sources: List[Dict[str, Any]]) -> str:
    labels = []
    for source in selected_sources[:SOURCE_LIMIT]:
        label = get_selected_source_label(source)
        if label:
            labels.append(label)

    labels = dedupe_preserve_order(labels)
    if len(labels) == 0:
        return 'the strongest retrieved passages'

    return format_term_list(labels)

def build_summary_paragraph(selected_sources: List[Dict[str, Any]], scope_label: str) -> str:
    if scope_label == 'topic cluster':
        primary_source = selected_sources[0] if len(selected_sources) > 0 else None
        source_text = primary_source.get('chunk') if primary_source else None
        if not source_text:
            return 'No source passages were retrieved.'

        stripped = strip_intro_label(strip_leading_label(source_text['text'], source_text.get('heading') or source_text.get('label')))
        return clip_text(stripped, 18)

    focus_text = build_source_focus_text(selected_sources)
    if focus_text == 'the strongest retrieved passages':
        return 'This note stays grounded in the strongest retrieved passages.'

    return f"This note stays grounded in the strongest retrieved passages and keeps the focus on {focus_text}."

def build_takeaway_lines(selected_sources: List[Dict[str, Any]]) -> List[str]:
    labels = []
    for source in selected_sources[:SOURCE_LIMIT]:
        label = get_selected_source_label(source)
        if label:
            labels.append(label)

    takeaways = []
    if len(labels) > 0 and labels[0]:
        takeaways.append(f"Lead with {labels[0]}.")
    if len(labels) > 1 and labels[1]:
        takeaways.append(f"Use {labels[1]} as support.")
    if len(labels) > 2 and labels[2]:
        takeaways.append(f"Keep {labels[2]} tied to the source text.")
    elif len(labels) > 0:
        takeaways.append('Keep the final note tied to the source text.')

    if len(takeaways) == 0:
        takeaways.append('Keep the final note tied to the source text.')

    return dedupe_preserve_order(takeaways)[:3]

def build_draft_lines(selected_sources: List[Dict[str, Any]]) -> List[str]:
    lines = []
    prefixes = ['Core', 'Support', 'Evidence', 'More']

    for idx, prefix in enumerate(prefixes):
        if idx < len(selected_sources) and selected_sources[idx]:
            chunk = selected_sources[idx]['chunk']
            stripped = strip_intro_label(strip_leading_label(chunk['text'], chunk.get('heading') or chunk.get('label')))
            lines.append(f"{prefix}: {clip_text(stripped, 18)}")

    return dedupe_preserve_order(lines)[:4]

def build_follow_ups(selected_sources: List[Dict[str, Any]]) -> List[str]:
    follow_ups = []
    if len(selected_sources) < SOURCE_LIMIT:
        follow_ups.append('Should one more source passage be added?')

    if len(selected_sources) > 0 and selected_sources[0]:
        primary_label = get_selected_source_label(selected_sources[0])
        follow_ups.append(
            f"Should {primary_label} become the main takeaway?" if primary_label
            else 'Should the main takeaway be rewritten more tightly?'
        )

    return dedupe_preserve_order(follow_ups)[:2]

def build_hybrid_title(chunks: List[Dict[str, Any]], scope_label: str) -> str:
    heading_chunk = next((c for c in chunks if c['heading']), None)
    frequency_map = compute_frequency(chunks)
    top_tokens = get_top_tokens(frequency_map, 4)

    if heading_chunk and heading_chunk['heading']:
        return title_case(heading_chunk['heading'])

    if len(top_tokens) > 0:
        return f"{title_case(format_term_list(top_tokens[:3]))} RAG"

    if scope_label == 'topic cluster':
        return 'Topic RAG Note'

    return 'Hybrid RAG Note'

def build_rag_pack(chunks: List[Dict[str, Any]], options: Dict[str, Any] = None) -> Dict[str, Any]:
    if options is None:
        options = {}

    title = options.get('title')
    scope_label = options.get('scopeLabel', 'hybrid note')
    focus_terms = options.get('focusTerms', [])
    source_limit = options.get('sourceLimit', SOURCE_LIMIT)

    local_chunks = []
    for chunk in chunks:
        # Create deep copy of chunk dicts
        local_chunks.append({
            **chunk,
            'tokens': list(chunk['tokens']),
            'embedding': []
        })

    if len(local_chunks) == 0:
        return {
            'title': title or 'Hybrid RAG Note',
            'overview': f"No passages were available for {scope_label}.",
            'summary': '',
            'takeaways': [],
            'draft': [],
            'sources': [],
            'followUps': [],
            'queryTerms': []
        }

    frequency_map = compute_frequency(local_chunks)
    idf_map = compute_idf_map(local_chunks)

    for chunk in local_chunks:
        chunk['embedding'] = build_embedding(chunk['text'], idf_map)

    # Omit paraphrased passages (same meaning, different wording) so the
    # summary does not repeat content that was already covered.
    local_chunks = dedupe_paraphrased_chunks(local_chunks)

    # Filter out empty strings from focus_terms
    combined_terms = [t for t in (focus_terms + get_top_tokens(frequency_map, 6)) if t]
    query_terms = dedupe_preserve_order(combined_terms)

    query_text = build_focus_query(local_chunks, frequency_map, query_terms)
    query_embedding = build_embedding(query_text, idf_map)
    ranked_chunks = rank_chunks(local_chunks, query_embedding, frequency_map)
    selected_sources = select_sources(ranked_chunks, source_limit)

    sources_out = []
    for item in selected_sources:
        chunk = item['chunk']
        score = item['score']
        ex_lbl = chunk.get('heading') or chunk.get('label')
        ex_txt = strip_intro_label(strip_leading_label(chunk['text'], ex_lbl))
        sources_out.append({
            'id': chunk['id'],
            'kind': chunk['kind'],
            'heading': chunk['heading'],
            'score': round(score, 3),
            'excerpt': clip_text(ex_txt, 20)
        })

    return {
        'title': title or build_hybrid_title(local_chunks, scope_label),
        'overview': f"Retrieved {len(selected_sources)} passage{'s' if len(selected_sources) != 1 else ''} from {len(local_chunks)} chunk{'s' if len(local_chunks) != 1 else ''}.",
        'summary': build_summary_paragraph(selected_sources, scope_label),
        'takeaways': build_takeaway_lines(selected_sources),
        'draft': build_draft_lines(selected_sources),
        'sources': sources_out,
        'followUps': build_follow_ups(selected_sources),
        'queryTerms': query_terms
    }

def build_topic_label(cluster: Dict[str, Any], keywords: List[str], index: int) -> str:
    if cluster['heading']:
        return title_case(cluster['heading'])

    if len(keywords) > 0:
        return title_case(format_term_list(keywords[:3]))

    return f"Topic {index + 1}"

def build_topic_summary(cluster: Dict[str, Any], keywords: List[str]) -> str:
    focus_text = format_term_list(keywords[:4]) if len(keywords) > 0 else 'shared signals'
    if len(cluster['chunks']) == 1:
        return f"This cluster keeps {focus_text} inside one semantic chunk."
    return f"This cluster groups {focus_text} across {len(cluster['chunks'])} semantic chunks."

def cluster_topics(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    clusters = []

    for chunk in chunks:
        best_cluster = None
        best_score = 0.0

        for cluster in clusters:
            centroid_score = cosine_similarity(chunk['embedding'], cluster['centroid'])
            keyword_overlap = lexical_overlap_score(chunk['tokens'], cluster['keywordTokens'])
            heading_match = 0.15 if (cluster['heading'] and chunk['heading'] and cluster['heading'] == chunk['heading']) else 0.0
            score = centroid_score * 0.72 + keyword_overlap * 0.22 + heading_match

            if score > best_score:
                best_score = score
                best_cluster = cluster

        if not best_cluster or best_score < TOPIC_SIMILARITY_THRESHOLD:
            best_cluster = {
                'id': f"topic-{len(clusters) + 1}",
                'chunks': [],
                'centroid': [0.0] * EMBEDDING_DIMENSION,
                'heading': chunk['heading'] or '',
                'keywordTokens': []
            }
            clusters.append(best_cluster)

        best_cluster['chunks'].append(chunk)
        if not best_cluster['heading'] and chunk['heading']:
            best_cluster['heading'] = chunk['heading']
        
        best_cluster['centroid'] = average_vectors([m['embedding'] for m in best_cluster['chunks']])
        best_cluster['keywordTokens'] = dedupe_preserve_order(
            best_cluster['keywordTokens'] + chunk['tokens']
        )
        chunk['topicId'] = best_cluster['id']

    out_topics = []
    for idx, cluster in enumerate(clusters):
        keyword_frequency = {}
        for chunk in cluster['chunks']:
            for token in chunk['tokens']:
                keyword_frequency[token] = keyword_frequency.get(token, 0) + 1

        keywords = get_top_tokens(keyword_frequency, 5)
        label = build_topic_label(cluster, keywords, idx)
        
        coherence = 0.0
        if len(cluster['chunks']) > 0:
            coherence = sum(cosine_similarity(m['embedding'], cluster['centroid']) for m in cluster['chunks']) / len(cluster['chunks'])
        
        rag = build_rag_pack(cluster['chunks'], {
            'title': f"{label} RAG",
            'scopeLabel': 'topic cluster',
            'focusTerms': keywords,
            'sourceLimit': min(SOURCE_LIMIT, 3)
        })

        for chunk in cluster['chunks']:
            chunk['topicLabel'] = label

        out_topics.append({
            'id': cluster['id'],
            'label': label,
            'keywords': keywords,
            'chunkIds': [c['id'] for c in cluster['chunks']],
            'chunkCount': len(cluster['chunks']),
            'coherence': round(coherence, 3),
            'summary': build_topic_summary(cluster, keywords),
            'rag': rag
        })

    return out_topics

def build_embedding_report(chunks: List[Dict[str, Any]], query_embedding: List[float]) -> Dict[str, Any]:
    anchors = []
    for chunk in chunks:
        local_frequency = {}
        for token in chunk['tokens']:
            local_frequency[token] = local_frequency.get(token, 0) + 1

        nearest = []
        for other_chunk in chunks:
            if other_chunk['id'] == chunk['id']:
                continue
            nearest.append({
                'id': other_chunk['id'],
                'score': round(cosine_similarity(chunk['embedding'], other_chunk['embedding']), 3)
            })
        nearest = sorted(nearest, key=lambda entry: entry['score'], reverse=True)[:2]

        anchors.append({
            'id': chunk['id'],
            'label': chunk['label'],
            'score': round(cosine_similarity(chunk['embedding'], query_embedding), 3),
            'keywords': get_top_tokens(local_frequency, 4),
            'nearest': nearest
        })
    anchors = sorted(anchors, key=lambda entry: entry['score'], reverse=True)

    similarity_pairs = []
    for idx_l in range(len(chunks)):
        for idx_r in range(idx_l + 1, len(chunks)):
            left_chunk = chunks[idx_l]
            right_chunk = chunks[idx_r]
            score = cosine_similarity(left_chunk['embedding'], right_chunk['embedding'])
            if score < 0.45:
                continue
            similarity_pairs.append({
                'leftId': left_chunk['id'],
                'rightId': right_chunk['id'],
                'score': round(score, 3)
            })

    similarity_pairs = sorted(similarity_pairs, key=lambda entry: entry['score'], reverse=True)

    return {
        'anchors': anchors,
        'pairs': similarity_pairs[:6]
    }

def empty_result() -> Dict[str, Any]:
    return {
        'pipeline': {
            'overview': 'No note content was provided.',
            'chunkCount': 0,
            'topicCount': 0,
            'embeddingDimension': EMBEDDING_DIMENSION
        },
        'semantic': {
            'overview': 'No semantic chunks were created.',
            'chunks': []
        },
        'topics': {
            'overview': 'No topic clusters were created.',
            'clusters': []
        },
        'embeddings': {
            'overview': 'No embeddings were generated.',
            'dimension': EMBEDDING_DIMENSION,
            'anchors': [],
            'pairs': [],
            'queryTerms': []
        },
        'rag': {
            'title': 'Hybrid RAG Note',
            'overview': 'No note content was provided.',
            'summary': '',
            'takeaways': [],
            'draft': [],
            'sources': [],
            'followUps': [],
            'topicRags': []
        }
    }

def process_notes(input_text: str) -> Dict[str, Any]:
    chunks = split_into_semantic_chunks(input_text)
    if len(chunks) == 0:
        return empty_result()

    frequency_map = compute_frequency(chunks)
    idf_map = compute_idf_map(chunks)

    for chunk in chunks:
        chunk['embedding'] = build_embedding(chunk['text'], idf_map)

    main_query_terms = get_top_tokens(frequency_map, 6)
    main_query_text = build_focus_query(chunks, frequency_map, main_query_terms)
    main_query_embedding = build_embedding(main_query_text, idf_map)
    ranked_chunks = rank_chunks(chunks, main_query_embedding, frequency_map)
    selected_topics = cluster_topics(chunks)

    semantic_chunks = []
    for chunk in chunks:
        chunk_freq = {}
        for token in chunk['tokens']:
            chunk_freq[token] = frequency_map.get(token, 0)

        # find score in ranked_chunks
        score_val = 0.0
        for entry in ranked_chunks:
            if entry['chunk']['id'] == chunk['id']:
                score_val = entry['score']
                break

        semantic_chunks.append({
            'id': chunk['id'],
            'index': chunk['index'],
            'kind': chunk['kind'],
            'label': chunk['label'],
            'heading': chunk['heading'],
            'text': chunk['text'],
            'tokenCount': len(chunk['tokens']),
            'sentenceCount': chunk['sentenceCount'],
            'keywords': get_top_tokens(chunk_freq, 4),
            'embeddingScore': round(score_val, 3),
            'topicId': chunk['topicId'],
            'topicLabel': chunk['topicLabel']
        })

    topic_lookup = {t['id']: t['label'] for t in selected_topics}
    rag = build_rag_pack(chunks, {
        'title': build_hybrid_title(chunks, 'hybrid note'),
        'scopeLabel': 'hybrid note',
        'focusTerms': main_query_terms,
        'sourceLimit': SOURCE_LIMIT
    })
    embeddings = build_embedding_report(chunks, main_query_embedding)

    topics_out = []
    for topic in selected_topics:
        topics_out.append({
            **topic,
            'label': topic_lookup.get(topic['id']) or topic['label']
        })

    return {
        'pipeline': {
            'overview': f"Split the note into {len(chunks)} semantic chunk{'s' if len(chunks) != 1 else ''}, grouped them into {len(selected_topics)} topic cluster{'s' if len(selected_topics) != 1 else ''}, and ran a local RAG pass inside each cluster.",
            'chunkCount': len(chunks),
            'topicCount': len(selected_topics),
            'embeddingDimension': EMBEDDING_DIMENSION
        },
        'semantic': {
            'overview': f"Semantic chunking produced {len(chunks)} chunk{'s' if len(chunks) != 1 else ''} from the input note.",
            'chunks': semantic_chunks
        },
        'topics': {
            'overview': f"Topic modeling grouped the chunks into {len(selected_topics)} cluster{'s' if len(selected_topics) != 1 else ''} with nested RAG drafts.",
            'clusters': topics_out
        },
        'embeddings': {
            'overview': f"Hashed-IDF embeddings compare each semantic chunk in a {EMBEDDING_DIMENSION}-dimensional space.",
            'dimension': EMBEDDING_DIMENSION,
            'queryTerms': main_query_terms,
            'anchors': embeddings['anchors'],
            'pairs': embeddings['pairs']
        },
        'rag': {
            **rag,
            'topicRags': [{
                'id': topic['id'],
                'title': topic['label'],
                'summary': topic['rag']['summary'],
                'takeaways': topic['rag']['takeaways'],
                'draft': topic['rag']['draft'],
                'sources': topic['rag']['sources']
            } for topic in selected_topics]
        }
    }
