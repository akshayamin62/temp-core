"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentSuggestions = void 0;
const AgentSuggestion_1 = __importDefault(require("../models/ivy/AgentSuggestion"));
const PointerNo_1 = require("../types/PointerNo");
/**
 * Normalize text for processing
 */
const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
/**
 * Domain knowledge mapping for intelligent career understanding
 * This provides semantic expansion without hardcoding specific activities
 * Includes both direct terms AND conceptual/skill-based keywords
 */
const CAREER_DOMAIN_MAP = {
    // Medical/Healthcare
    'dentist': ['dental', 'oral', 'health', 'medical', 'healthcare', 'biology', 'anatomy', 'patient', 'clinical', 'hygiene', 'orthodontic', 'teeth', 'preventive', 'diagnosis'],
    'dental': ['dentist', 'oral', 'health', 'medical', 'healthcare', 'biology', 'anatomy', 'patient', 'clinical'],
    'doctor': ['medical', 'healthcare', 'clinical', 'patient', 'health', 'medicine', 'hospital', 'diagnosis', 'treatment', 'biology', 'anatomy', 'physiology', 'wellness', 'disease', 'therapy'],
    'physician': ['medical', 'healthcare', 'clinical', 'patient', 'health', 'medicine', 'hospital', 'diagnosis', 'treatment'],
    'nurse': ['healthcare', 'medical', 'patient', 'clinical', 'health', 'nursing', 'care', 'hospital', 'wellness', 'treatment'],
    'surgeon': ['medical', 'surgical', 'healthcare', 'clinical', 'patient', 'hospital', 'anatomy', 'operation'],
    'pharmacist': ['pharmaceutical', 'medical', 'healthcare', 'drug', 'medicine', 'chemistry', 'clinical'],
    // STEM
    'engineer': ['engineering', 'technical', 'design', 'build', 'system', 'technology', 'innovation', 'development', 'problem solving', 'mathematics', 'physics'],
    'scientist': ['science', 'research', 'experiment', 'analysis', 'laboratory', 'discovery', 'study', 'investigation', 'hypothesis', 'data'],
    'researcher': ['research', 'study', 'investigation', 'analysis', 'academic', 'scientific', 'experiment', 'data', 'publication', 'methodology'],
    'data': ['analytics', 'statistics', 'analysis', 'programming', 'algorithm', 'machine learning', 'database', 'visualization', 'modeling', 'insights', 'python', 'coding'],
    'software': ['programming', 'coding', 'development', 'computer', 'technology', 'algorithm', 'application', 'system', 'debugging', 'web', 'mobile'],
    'computer': ['programming', 'coding', 'software', 'technology', 'digital', 'algorithm', 'computing', 'IT', 'cybersecurity'],
    // Business/Finance
    'finance': ['financial', 'economics', 'banking', 'investment', 'accounting', 'market', 'business', 'monetary', 'trading', 'portfolio', 'risk'],
    'business': ['entrepreneurship', 'management', 'economics', 'marketing', 'finance', 'corporate', 'strategy', 'commerce', 'startup', 'venture'],
    'entrepreneur': ['business', 'startup', 'innovation', 'venture', 'enterprise', 'founding', 'commercial', 'market', 'pitch', 'scale', 'growth'],
    'marketing': ['advertising', 'branding', 'business', 'consumer', 'digital', 'communication', 'promotion', 'strategy', 'social media', 'campaign', 'content'],
    'accountant': ['accounting', 'finance', 'financial', 'audit', 'taxation', 'business', 'economics', 'bookkeeping'],
    // Law/Policy
    'lawyer': ['legal', 'law', 'justice', 'court', 'litigation', 'advocacy', 'rights', 'policy', 'attorney', 'constitutional', 'criminal', 'civil'],
    'attorney': ['legal', 'law', 'justice', 'court', 'litigation', 'advocacy', 'rights', 'policy'],
    'policy': ['government', 'public', 'governance', 'political', 'legislation', 'advocacy', 'reform', 'analysis', 'civic', 'democracy'],
    // Arts/Media/Communication
    'mass': ['communication', 'media', 'journalism', 'broadcasting', 'digital', 'content', 'storytelling', 'audience', 'message'],
    'communication': ['media', 'journalism', 'broadcasting', 'public speaking', 'writing', 'storytelling', 'presentation', 'digital', 'content', 'messaging', 'audience', 'campaign', 'social media', 'film', 'video', 'podcast', 'radio', 'television', 'news', 'reporting'],
    'journalist': ['media', 'writing', 'reporting', 'news', 'communication', 'press', 'publishing', 'investigation', 'journalism', 'interview', 'story', 'article', 'documentary', 'broadcast'],
    'journalism': ['media', 'writing', 'reporting', 'news', 'communication', 'press', 'publishing', 'investigation', 'interview', 'story', 'article', 'documentary'],
    'media': ['journalism', 'broadcasting', 'digital', 'social media', 'content', 'production', 'film', 'video', 'communication', 'storytelling', 'creative', 'news'],
    'writer': ['writing', 'literature', 'creative', 'publishing', 'communication', 'storytelling', 'journalism', 'author', 'essay', 'poetry', 'novel', 'content'],
    'arts': ['art', 'creative', 'design', 'visual', 'artistic', 'expression', 'cultural', 'aesthetic', 'painting', 'sculpture', 'drawing', 'music', 'theater', 'performance', 'dance', 'film', 'photography', 'exhibition', 'gallery', 'installation', 'craft'],
    'art': ['arts', 'creative', 'design', 'visual', 'artistic', 'expression', 'cultural', 'aesthetic', 'painting', 'sculpture', 'drawing', 'exhibition', 'gallery'],
    'artist': ['art', 'creative', 'design', 'visual', 'artistic', 'expression', 'cultural', 'aesthetic', 'painting', 'sculpture', 'exhibition', 'gallery', 'installation'],
    'designer': ['design', 'creative', 'visual', 'artistic', 'graphics', 'layout', 'aesthetic', 'innovation', 'UX', 'UI', 'product', 'fashion', 'interior'],
    'film': ['cinema', 'movie', 'video', 'production', 'directing', 'screenplay', 'editing', 'cinematography', 'visual', 'storytelling', 'creative', 'media'],
    'theater': ['theatre', 'drama', 'performance', 'acting', 'stage', 'play', 'directing', 'production', 'creative', 'arts', 'expression'],
    'music': ['musical', 'composition', 'performance', 'instrument', 'concert', 'orchestra', 'band', 'singing', 'melody', 'rhythm', 'creative', 'arts'],
    'photography': ['photo', 'camera', 'visual', 'image', 'portrait', 'documentary', 'creative', 'arts', 'exhibition'],
    // Education
    'teacher': ['education', 'teaching', 'pedagogy', 'learning', 'curriculum', 'instruction', 'academic', 'school', 'mentoring', 'tutoring'],
    'educator': ['education', 'teaching', 'pedagogy', 'learning', 'curriculum', 'instruction', 'academic'],
    'professor': ['academic', 'research', 'teaching', 'education', 'scholarship', 'university', 'lecture', 'faculty'],
    // Social Sciences
    'psychologist': ['psychology', 'mental', 'behavioral', 'cognitive', 'counseling', 'therapy', 'health', 'research', 'wellness', 'emotional'],
    'psychology': ['mental', 'behavioral', 'cognitive', 'counseling', 'therapy', 'health', 'research', 'wellness', 'emotional', 'human behavior'],
    'sociologist': ['sociology', 'social', 'society', 'community', 'culture', 'research', 'behavior', 'analysis', 'demographics'],
    'sociology': ['social', 'society', 'community', 'culture', 'research', 'behavior', 'analysis', 'demographics', 'human'],
    'economist': ['economics', 'economic', 'financial', 'market', 'policy', 'analysis', 'trade', 'monetary'],
    'economics': ['economic', 'financial', 'market', 'policy', 'analysis', 'trade', 'monetary', 'business', 'commerce'],
    // Architecture/Design
    'architect': ['architecture', 'design', 'building', 'construction', 'structure', 'urban', 'spatial', 'planning', 'engineering'],
    'architecture': ['design', 'building', 'construction', 'structure', 'urban', 'spatial', 'planning', 'creative', 'engineering'],
    // Environmental
    'environment': ['environmental', 'ecology', 'sustainability', 'conservation', 'climate', 'nature', 'green', 'renewable', 'ecosystem'],
    'environmental': ['ecology', 'sustainability', 'conservation', 'climate', 'nature', 'green', 'renewable', 'ecosystem']
};
/**
 * Interpret career role and generate intent profile
 * Uses domain knowledge mapping + generic keyword extraction
 */
const interpretCareerIntent = (careerRole) => {
    const normalized = normalizeText(careerRole);
    // Extract all meaningful words
    const stopWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'with', 'from', 'this', 'that',
        'will', 'can', 'has', 'have', 'had', 'was', 'were', 'been', 'being',
        'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between'
    ]);
    const careerWords = normalized
        .split(' ')
        .filter(word => word.length > 3) // Increased from 2 to 3 to avoid "dent" matching "student"
        .filter(word => !stopWords.has(word));
    const allKeywords = new Set();
    // Add original words
    careerWords.forEach(word => allKeywords.add(word));
    // Add domain-specific keywords using knowledge map
    careerWords.forEach(word => {
        if (CAREER_DOMAIN_MAP[word]) {
            CAREER_DOMAIN_MAP[word].forEach(keyword => allKeywords.add(keyword));
        }
    });
    // Add full phrase
    allKeywords.add(normalized);
    return {
        coreSkills: Array.from(allKeywords),
        impactAreas: Array.from(allKeywords),
        academicDisciplines: Array.from(allKeywords),
        practicalApplications: Array.from(allKeywords),
        allKeywords
    };
};
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 STAGE 2 — CANDIDATE RETRIEVAL (HIGH-RECALL, RULE-BASED)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Retrieve ALL potentially relevant activities using:
 * - Direct term matching
 * - Partial word matching
 * - Stem matching (cautious, 4+ chars)
 * - Tag-specific matching (high-signal)
 * - Cross-disciplinary relevance
 * - Impact-area alignment
 *
 * Output: Candidate pool (can be large, maximizes recall)
 * ═══════════════════════════════════════════════════════════════════════════
 */
const isActivityRelevant = (activity, intent) => {
    const activityText = normalizeText(`${activity.title} ${activity.description} ${activity.tags.join(' ')}`);
    // Use word-boundary matching to prevent false positives like "dent" matching "student"
    for (const keyword of intent.allKeywords) {
        // Create regex with word boundaries to match whole words only
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
        if (wordBoundaryRegex.test(activityText)) {
            return true;
        }
    }
    return false;
};
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 STAGE 3 — REASONING & SCORING (CORE INTELLIGENCE)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Score each activity on 5 dimensions (0-5 each):
 * 1. Career Alignment: How directly it builds career skills/identity
 * 2. Leadership Depth: Founder > Leader > Contributor
 * 3. Ownership & Initiative: Created/scaled/owned outcomes
 * 4. Impact Scale: Local < Regional < National < Global
 * 5. Spike Potential: Can this become defining narrative
 *
 * Calculate composite score for ranking
 * Generate reasoning: "Why This Fits" and "Ivy-Level Justification"
 * ═══════════════════════════════════════════════════════════════════════════
 */
const scoreActivity = (activity, careerRole, intent) => {
    const title = activity.title.toLowerCase();
    const description = activity.description.toLowerCase();
    const tags = activity.tags.map(t => t.toLowerCase());
    const allText = `${title} ${description} ${tags.join(' ')}`;
    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSION 1: CAREER ALIGNMENT (0-5)
    // ─────────────────────────────────────────────────────────────────────────
    let careerAlignment = 0;
    let matchedKeywords = 0;
    for (const keyword of intent.coreSkills) {
        // Use word-boundary matching for scoring as well
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
        if (wordBoundaryRegex.test(allText)) {
            matchedKeywords++;
        }
    }
    // Direct career mention in title = high alignment
    if (title.includes(careerRole.toLowerCase())) {
        careerAlignment = 5;
    }
    else if (matchedKeywords >= 3) {
        careerAlignment = 4;
    }
    else if (matchedKeywords >= 2) {
        careerAlignment = 3;
    }
    else if (matchedKeywords >= 1) {
        careerAlignment = 2;
    }
    else {
        careerAlignment = 1;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSION 2: LEADERSHIP DEPTH (0-5)
    // ─────────────────────────────────────────────────────────────────────────
    let leadershipDepth = 0;
    const founderKeywords = ['found', 'start', 'create', 'establish', 'launch', 'initiate'];
    const leaderKeywords = ['lead', 'manage', 'direct', 'organize', 'coordinate', 'head'];
    const contributorKeywords = ['participate', 'join', 'volunteer', 'assist', 'help', 'support'];
    if (founderKeywords.some(kw => allText.includes(kw))) {
        leadershipDepth = 5;
    }
    else if (leaderKeywords.some(kw => allText.includes(kw))) {
        leadershipDepth = 4;
    }
    else if (contributorKeywords.some(kw => allText.includes(kw))) {
        leadershipDepth = 2;
    }
    else {
        leadershipDepth = 3; // Default moderate
    }
    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSION 3: OWNERSHIP & INITIATIVE (0-5)
    // ─────────────────────────────────────────────────────────────────────────
    let ownershipInitiative = 0;
    const ownershipKeywords = ['design', 'develop', 'build', 'create', 'own', 'drive', 'scale', 'grow', 'implement'];
    const ownershipCount = ownershipKeywords.filter(kw => allText.includes(kw)).length;
    if (ownershipCount >= 3) {
        ownershipInitiative = 5;
    }
    else if (ownershipCount >= 2) {
        ownershipInitiative = 4;
    }
    else if (ownershipCount >= 1) {
        ownershipInitiative = 3;
    }
    else {
        ownershipInitiative = 2;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSION 4: IMPACT SCALE (0-5)
    // ─────────────────────────────────────────────────────────────────────────
    let impactScale = 0;
    const globalKeywords = ['global', 'international', 'worldwide', 'cross border'];
    const nationalKeywords = ['national', 'country', 'nationwide'];
    const regionalKeywords = ['regional', 'state', 'province', 'district'];
    const localKeywords = ['local', 'community', 'neighborhood', 'school'];
    if (globalKeywords.some(kw => allText.includes(kw))) {
        impactScale = 5;
    }
    else if (nationalKeywords.some(kw => allText.includes(kw))) {
        impactScale = 4;
    }
    else if (regionalKeywords.some(kw => allText.includes(kw))) {
        impactScale = 3;
    }
    else if (localKeywords.some(kw => allText.includes(kw))) {
        impactScale = 2;
    }
    else {
        impactScale = 3; // Default moderate
    }
    // ─────────────────────────────────────────────────────────────────────────
    // DIMENSION 5: SPIKE POTENTIAL (0-5)
    // ─────────────────────────────────────────────────────────────────────────
    let spikePotential = 0;
    const spikeKeywords = ['research', 'publication', 'award', 'competition', 'innovation', 'original', 'unique', 'first'];
    const spikeCount = spikeKeywords.filter(kw => allText.includes(kw)).length;
    if (spikeCount >= 3) {
        spikePotential = 5;
    }
    else if (spikeCount >= 2) {
        spikePotential = 4;
    }
    else if (spikeCount >= 1) {
        spikePotential = 3;
    }
    else {
        spikePotential = 2;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // COMPOSITE SCORE
    // ─────────────────────────────────────────────────────────────────────────
    const compositeScore = careerAlignment +
        leadershipDepth +
        ownershipInitiative +
        impactScale +
        spikePotential;
    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE REASONING
    // ─────────────────────────────────────────────────────────────────────────
    const whyThisFits = generateWhyThisFits(activity, careerRole, careerAlignment, matchedKeywords);
    const ivyLevelJustification = generateIvyJustification(activity, leadershipDepth, impactScale, spikePotential);
    return {
        activity,
        rank: 0, // Will be assigned in Stage 4
        scores: {
            careerAlignment,
            leadershipDepth,
            ownershipInitiative,
            impactScale,
            spikePotential
        },
        compositeScore,
        whyThisFits,
        ivyLevelJustification
    };
};
const generateWhyThisFits = (_activity, careerRole, alignmentScore, matchedKeywords) => {
    const skillsPhrase = matchedKeywords > 1 ? 'develops multiple core skills' : 'builds foundational skills';
    if (alignmentScore >= 4) {
        return `This activity directly aligns with ${careerRole} by ${skillsPhrase} essential for this career path. The hands-on experience provides practical application of domain knowledge, preparing students for real-world challenges in this field.`;
    }
    else if (alignmentScore >= 3) {
        return `This activity supports a ${careerRole} career trajectory through ${skillsPhrase} and practical engagement. It offers relevant experience that complements academic preparation and demonstrates genuine interest in the field.`;
    }
    else {
        return `While not directly career-specific, this activity develops transferable skills valuable for ${careerRole}, including problem-solving, analytical thinking, and initiative that apply across professional contexts.`;
    }
};
const generateIvyJustification = (_activity, leadershipScore, impactScore, spikeScore) => {
    const leadershipPhrase = leadershipScore >= 4
        ? 'Demonstrates exceptional leadership through ownership and initiative'
        : 'Shows leadership potential and active engagement';
    const impactPhrase = impactScore >= 4
        ? 'with measurable impact at scale'
        : 'with meaningful community impact';
    const spikePhrase = spikeScore >= 4
        ? 'The unique, research-driven approach creates a distinctive profile element that signals intellectual depth and originality.'
        : 'This activity contributes to a well-rounded profile by showcasing commitment beyond academics.';
    return `${leadershipPhrase} ${impactPhrase}. ${spikePhrase}`;
};
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏆 STAGE 4 — RANKING & FILTERING (PRECISION LAYER)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sort by composite score (descending)
 * Filter top 10-20 activities
 * Assign final rank numbers
 * Prioritize depth over variety
 * ═══════════════════════════════════════════════════════════════════════════
 */
const rankAndFilter = (scoredActivities) => {
    // Sort by composite score (highest first)
    const ranked = scoredActivities.sort((a, b) => b.compositeScore - a.compositeScore);
    // Filter top 10-20 (prefer 15-20 for variety)
    const topActivities = ranked.slice(0, 20);
    // Assign rank numbers
    topActivities.forEach((activity, index) => {
        activity.rank = index + 1;
    });
    return topActivities;
};
const getAgentSuggestions = async (careerRole, pointerNo) => {
    // ─────────────────────────────────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    if (pointerNo !== PointerNo_1.PointerNo.SpikeInOneArea &&
        pointerNo !== PointerNo_1.PointerNo.LeadershipInitiative &&
        pointerNo !== PointerNo_1.PointerNo.GlobalSocialImpact) {
        throw new Error('Invalid pointerNo. Only 2, 3, or 4 are allowed.');
    }
    if (!careerRole || typeof careerRole !== 'string' || careerRole.trim().length === 0) {
        throw new Error('careerRole is required and must be a non-empty string');
    }
    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 1: CAREER INTENT UNDERSTANDING
    // ─────────────────────────────────────────────────────────────────────────
    const careerIntent = interpretCareerIntent(careerRole);
    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 2: CANDIDATE RETRIEVAL (HIGH RECALL)
    // ─────────────────────────────────────────────────────────────────────────
    // Fetch all activities for this pointer from database
    const allActivities = await AgentSuggestion_1.default.find({ pointerNo }).exec();
    if (allActivities.length === 0) {
        return [];
    }
    // Filter activities based on career intent (HIGH RECALL)
    const candidateActivities = allActivities.filter((activity) => isActivityRelevant(activity, careerIntent));
    if (candidateActivities.length === 0) {
        return [];
    }
    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 3: SCORING & REASONING (CORE INTELLIGENCE)
    // ─────────────────────────────────────────────────────────────────────────
    const scoredActivities = candidateActivities.map((activity) => scoreActivity(activity, careerRole, careerIntent));
    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 4: RANKING & FILTERING (PRECISION LAYER)
    // ─────────────────────────────────────────────────────────────────────────
    const rankedActivities = rankAndFilter(scoredActivities);
    // Convert back to IAgentSuggestion[] for backward compatibility
    return rankedActivities.map(scored => scored.activity);
};
exports.getAgentSuggestions = getAgentSuggestions;
//# sourceMappingURL=agentSuggestion.service.js.map