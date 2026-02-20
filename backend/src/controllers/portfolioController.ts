import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import BrainographyData, { IBrainographyData, SkillWithPercentage } from '../models/BrainographyData';
import Portfolio, { PortfolioType, PortfolioStatus } from '../models/Portfolio';
import StudentDocument from '../models/StudentDocument';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Student from '../models/Student';
import User from '../models/User';
import { USER_ROLE } from '../types/roles';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

const BRAINOGRAPHY_DOC_KEY = 'brainography_report';

// ─────────────────────────────────────────────────────────────────────────
// HELPER: Get OpenAI client
// ─────────────────────────────────────────────────────────────────────────
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in environment variables');
  return new OpenAI({ apiKey });
}

// ─────────────────────────────────────────────────────────────────────────
// HELPER: Build skill‐action guidance (ported from Python)
// ─────────────────────────────────────────────────────────────────────────
function buildSkillActionGuidance(skills: SkillWithPercentage[]): string {
  const skillMap: Record<string, string> = {
    Strategy: 'Prioritize planning, frameworks, option analysis, roadmaps, and decision memos.',
    Execution: 'Prioritize weekly schedules, checklists, sprint plans, deliverables, accountability.',
    Intellect: 'Prioritize deep learning plans, conceptual clarity, problem-solving drills.',
    Asthetic: 'Prioritize portfolio presentation, design taste, storytelling, and improvement loops.',
    Balance: 'Prioritize time-blocking, burnout prevention, sustainable habits, and realistic pacing.',
    Movement: 'Prioritize activity-based learning, practice-first tasks, daily reps.',
    Expression: 'Prioritize communication deliverables: presentations, writing, speaking practice.',
    Articulation: 'Prioritize structured writing, clarity, argument building, explanation skill.',
    Observation: 'Prioritize research, analysis, pattern recognition, journaling, case studies.',
    Ecological: 'Prioritize systems thinking, context awareness, collaboration, stakeholder mapping.',
  };

  const sorted = [...skills].sort((a, b) => b.percentage - a.percentage);
  const lines = ['SKILL PRIORITIZATION (ordered by percentage):'];
  for (const s of sorted) {
    const desc = skillMap[s.name] || '';
    lines.push(`- ${s.name} (${s.percentage}%): ${desc}`);
  }
  if (lines.length === 1) return '- No dominant skill guidance available.';
  lines.push('\nIMPORTANT: Weight recommendations based on these percentages.');
  return lines.join('\n');
}

function formatSkillsWithPercentages(skills: SkillWithPercentage[]): string {
  if (!skills || skills.length === 0) return 'NA';
  return skills.map(s => {
    const display = s.rawPercentage || String(s.percentage);
    return s.percentage ? `${s.name} (${display}%)` : s.name;
  }).join(', ');
}

// ─────────────────────────────────────────────────────────────────────────
// INTERNAL: Extract data from brainography PDF (callable without HTTP)
// ─────────────────────────────────────────────────────────────────────────
export async function runBrainographyExtraction(registrationId: string): Promise<void> {
  const brainDoc = await StudentDocument.findOne({ registrationId, documentKey: BRAINOGRAPHY_DOC_KEY }).lean().exec();
  if (!brainDoc) throw new Error('Brainography report not found');

  const registration = await StudentServiceRegistration.findById(registrationId).lean().exec();
  if (!registration) throw new Error('Registration not found');

  const filePath = path.join(process.cwd(), brainDoc.filePath);
  if (!fs.existsSync(filePath)) throw new Error('Brainography PDF file not found on server');

  const fileBuffer = fs.readFileSync(filePath);
  const pdfBase64 = fileBuffer.toString('base64');

  const client = getOpenAIClient();
  const extractionPrompt = buildExtractionPrompt();

  const response = await client.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: path.basename(filePath),
              file_data: `data:application/pdf;base64,${pdfBase64}`,
            },
          } as any,
          {
            type: 'text',
            text: extractionPrompt,
          },
        ],
      },
    ],
    temperature: 0.1,
    // max_tokens: 8000,
    max_completion_tokens:8000
  });

  const rawContent = response.choices[0]?.message?.content?.trim() || '{}';
  let jsonStr = rawContent;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  const extracted = JSON.parse(jsonStr);

  const student = await Student.findById(registration.studentId).populate('userId', 'firstName middleName lastName').lean().exec();
  const studentUser = student?.userId as any;
  const dbStudentName = studentUser ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ') : '';

  const dataToSave = {
    registrationId,
    studentId: registration.studentId,
    studentName: extracted.studentName || dbStudentName,
    standard: extracted.standard || '',
    board: extracted.board || '',
    highestSkills: (extracted.highestSkills || []).map((s: any) => ({ name: s.name, percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') })),
    thinkingPattern: (() => {
      const arr = Array.isArray(extracted.thinkingPattern)
        ? extracted.thinkingPattern.map((s: any) => ({ name: String(s.name || ''), percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') }))
        : [];
      const dominant = [...arr].sort((a, b) => b.percentage - a.percentage)[0]?.name || (typeof extracted.thinkingPattern === 'string' ? extracted.thinkingPattern : '');
      return dominant;
    })(),
    thinkingPatternDetails: Array.isArray(extracted.thinkingPattern)
      ? extracted.thinkingPattern.map((s: any) => ({ name: String(s.name || ''), percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') }))
      : [],
    achievementStyle: (extracted.achievementStyle || []).map((s: any) => ({ name: s.name, percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') })),
    learningCommunicationStyle: (extracted.learningCommunicationStyle || []).map((s: any) => ({ name: s.name, percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') })),
    quotients: (extracted.quotients || []).map((s: any) => ({ name: s.name, percentage: parseFloat(String(s.percentage)) || 0, rawPercentage: String(s.percentage ?? '') })),
    personalityType: extracted.personalityType || '',
    careerGoals: extracted.careerGoals || [],
    extractedAt: new Date(),
    extractedFromDocId: brainDoc._id,
    rawExtraction: rawContent,
  };

  await BrainographyData.findOneAndUpdate(
    { registrationId },
    { $set: dataToSave },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

// Helper: build extraction prompt (PDF is sent directly — no text arg needed)
function buildExtractionPrompt(): string {
  return `You are a precise data extraction engine for educational brainography assessment reports. You will be given a PDF of such a report.

Your task is to extract ONLY the fields listed below from the PDF and return valid JSON. NEVER invent, guess, or hallucinate values. If a field is not clearly present in the PDF, return an empty string or empty array for that field.

━━━━━━━━━ FIELDS TO EXTRACT ━━━━━━━━━

1. STUDENT NAME
   - Extract the full name of the student as written in the report.

2. STANDARD / YEAR
   - The student's educational level exactly as written (e.g. "8th", "10th", "12th", "FY", "SY", "TY", "3rd Year BTech").

3. BOARD
   - The educational board (e.g. "CBSE", "ICSE", "State Board", "IB", "Cambridge").
   - Look for it near the school name / student details section.
   - If not explicitly stated, return empty string.

4. HIGHEST SKILLS (with percentages)
   - ONLY from this fixed list: Strategy, Execution, Intellect, Asthetic, Balance, Movement, Expression, Articulation, Observation, Ecological.
   - Each skill has a percentage value shown next to it as a bar or number.
   - Include ALL 10 skills from the list above — they are always present in brainography reports.
   - The value may be a number like "14.97%", an expression like "11.56+1X", or even just "X%" — ALL are valid and MUST be included.
   - "X%" is a VALID percentage value. Do NOT skip a skill just because its value is "X%" or "0%" — include it.
   - A skill entry = {"name": "<skill name>", "percentage": "<raw string from PDF>"}

5. THINKING PATTERN (with percentages)
   - Extract BOTH "Logical" and "Emotional" with their percentage values from the PDF.
   - Both values are typically shown in the brainography report with bars or numbers.
   - Return as an array with both entries: [{"name": "Logical", "percentage": "<raw string>"}, {"name": "Emotional", "percentage": "<raw string>"}]
   - ONLY include entries that have a visible percentage value.

6. ACHIEVEMENT STYLE (with percentages)
   - ONLY from this fixed list: Follower, Experimental, Different, Thoughtful
   - Include ALL 4 styles from the list above — they are always present in brainography reports.
   - Some styles may have 0% or no visible value — if so, return "0%" for that style.
   - DO NOT skip a style just because its percentage is 0% or not prominent.
   - Each entry = {"name": "<style name>", "percentage": "<raw string from PDF>"}

7. LEARNING & COMMUNICATION STYLE (with percentages)
   - ONLY from this fixed list: Visual Learner, Auditory Learner, Physical Learner
   - Include ALL 3 styles from the list above — they are always present in brainography reports.
   - CRITICAL: Carefully match EACH style name to its OWN percentage value. The names and percentages may appear as bars, labels, or in a chart.
   - Look for labels like "Visual", "Auditory", "Physical" (or "Kinesthetic") and match each to the CORRECT percentage next to it.
   - Some styles may have 0% — if so, return "0%" for that style. Do NOT skip any.
   - Each entry = {"name": "<style name>", "percentage": "<raw string from PDF>"}

8. QUOTIENTS (with percentages)
   - ONLY from this fixed list (use these EXACT full names):
     "IQ (Intelligence Quotient)", "EQ (Emotional Quotient)", "AQ (Adversity Quotient)", "VQ (Visionary Quotient)", "CQ (Creativity Quotient)"
   - Include ONLY the quotients that appear with a percentage value in the PDF.
   - Each entry = {"name": "<full name>", "percentage": "<raw string from PDF>"}

9. PERSONALITY TYPE
   - ONLY one of exactly these four values: "Decisive", "Expressive", "Supportive", "Rule-Conscious"
   - Look for which one is highlighted, checked, or marked in the PDF.
   - Return ONLY the single selected value as a string. Never return multiple.

10. CAREER GOALS (careerGoals)
    - Look for a section titled "A KEY OF CAREER", "A KEY O CAREER", "Career Keys", "Career Blueprint", or similar heading.
    - This section typically has TWO sub-sections:
      a) "CAREER - HIGHLY RECOMMENDED" — a list of career fields/domains
      b) "CAREER - RECOMMENDED" — another list of career fields/domains
    - Extract EVERY career field/domain listed under BOTH sub-sections as separate array items.
    - These are broad career fields like "STEM", "Law & Legal Services", "Medicine", "Fire & Rescue", NOT specific job titles.
    - Include the full text of each bullet/item exactly as written (e.g. "Business, Finance & Management", "Public Services, Government & Administration").
    - Return as a FLAT array of strings combining items from both Highly Recommended and Recommended sections.
    - This section is almost always present in brainography reports — look carefully through ALL pages of the PDF.

━━━━━━━━━ PERCENTAGE EXTRACTION RULES ━━━━━━━━━

- Percentage values may appear in non-standard visual formats such as: "11.53+1X", "14.2%", "18.5 + 2X", "9.8+1X", "14", "14.00", "X%", "0%", etc.
- "X%" is a VALID percentage string — include it as-is, do NOT skip the item.
- YOU MUST copy the EXACT raw string as it visually appears in the PDF. DO NOT evaluate math. DO NOT round. DO NOT change the format.
- Example: if PDF shows "11.53+1X" → return "11.53+1X", NOT 12.53 or "12.53".
- Example: if PDF shows "X%" → return "X%".
- Return percentage as a STRING in all cases.

━━━━━━━━━ ANTI-HALLUCINATION RULES ━━━━━━━━━

- NEVER add a skill, style, or quotient that is not visually present in the PDF.
- NEVER guess the board if it is not written anywhere.
- If a multi-select field has zero entries visible in the PDF, return an empty array [].
- If Personality Type is unclear or absent, return empty string "".
- The ONLY allowed values for Personality Type are: "Decisive", "Expressive", "Supportive", "Rule-Conscious".
- For careerGoals: look VERY carefully through ALL pages — the career section is usually near the end of the PDF. It is almost ALWAYS present.

━━━━━━━━━ OUTPUT FORMAT ━━━━━━━━━

Return ONLY this JSON object — no markdown, no explanation, no extra keys:

{
  "studentName": "string",
  "standard": "string",
  "board": "string",
  "highestSkills": [{"name": "string", "percentage": "string"}],
  "thinkingPattern": [{"name": "Logical", "percentage": "string"}, {"name": "Emotional", "percentage": "string"}],
  "achievementStyle": [{"name": "string", "percentage": "string"}],
  "learningCommunicationStyle": [{"name": "string", "percentage": "string"}],
  "quotients": [{"name": "string", "percentage": "string"}],
  "personalityType": "string",
  "careerGoals": ["string"]
}`;
}

// ─────────────────────────────────────────────────────────────────────────
// 1. EXTRACT DATA FROM BRAINOGRAPHY PDF (HTTP endpoint)
// ─────────────────────────────────────────────────────────────────────────
export const extractBrainographyData = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    await runBrainographyExtraction(registrationId);

    const brainData = await BrainographyData.findOne({ registrationId }).lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Brainography data extracted successfully',
      data: { brainographyData: brainData },
    });
  } catch (error: any) {
    console.error('Extract brainography data error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract brainography data',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// 2. GET EXTRACTED BRAINOGRAPHY DATA
// ─────────────────────────────────────────────────────────────────────────
export const getBrainographyData = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const data = await BrainographyData.findOne({ registrationId }).lean().exec();
    return res.status(200).json({
      success: true,
      message: data ? 'Brainography data found' : 'No extracted data yet',
      data: { brainographyData: data },
    });
  } catch (error: any) {
    console.error('Get brainography data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch brainography data' });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// 3. GENERATE PORTFOLIO (Career or Development report)
// ─────────────────────────────────────────────────────────────────────────
export const generatePortfolio = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const { reportType, selectedCareerGoals } = req.body;

    if (!reportType || !['career', 'development'].includes(reportType)) {
      return res.status(400).json({ success: false, message: 'reportType must be "career" or "development"' });
    }
    if (!selectedCareerGoals || !Array.isArray(selectedCareerGoals) || selectedCareerGoals.length === 0 || selectedCareerGoals.length > 2) {
      return res.status(400).json({ success: false, message: 'Select 1 or 2 career goals' });
    }

    // Get brainography data
    const brainData = await BrainographyData.findOne({ registrationId }).lean().exec();
    if (!brainData) {
      return res.status(400).json({ success: false, message: 'Brainography data not extracted yet. Please extract first.' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId).lean().exec();
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // Check if portfolio already exists — update it
    let portfolio = await Portfolio.findOne({ registrationId, reportType });
    if (!portfolio) {
      portfolio = new Portfolio({
        registrationId,
        studentId: registration.studentId,
        reportType,
        selectedCareerGoals,
        status: PortfolioStatus.GENERATING,
      });
    } else {
      portfolio.selectedCareerGoals = selectedCareerGoals;
      portfolio.status = PortfolioStatus.GENERATING;
      portfolio.generationError = undefined;
    }
    await portfolio.save();

    // Generate report using multi-agent approach (ported from Python)
    try {
      const careerRolesStr = selectedCareerGoals.join(', ');
      const reportContent = await generateReportWithAgents(reportType as PortfolioType, brainData, careerRolesStr);

      // Save the generated DOCX file
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
      const { Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = await import('docx');
      const docSections = buildDocxSections(reportContent, reportType, brainData, careerRolesStr, { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType });
      const doc = new Document({ sections: docSections });

      const buffer = await Packer.toBuffer(doc);
      const studentDir = path.join(getUploadBaseDir(), registration.studentId.toString());
      ensureDir(studentDir);

      const sanitizedName = brainData.studentName.replace(/[^a-zA-Z0-9]/g, '_') || 'student';
      const sanitizedGoals = careerRolesStr.replace(/[^a-zA-Z0-9,]/g, '_').substring(0, 60);
      const reportName = reportType === 'career' ? 'Career_Report' : 'Development_Report';
      const fileName = `${reportName}_${sanitizedName}_${sanitizedGoals}.docx`;
      const filePath = path.join(studentDir, fileName);

      fs.writeFileSync(filePath, buffer);

      portfolio.reportContent = reportContent;
      portfolio.fileName = fileName;
      portfolio.filePath = `uploads/${registration.studentId}/${fileName}`;
      portfolio.fileSize = buffer.length;
      portfolio.status = PortfolioStatus.COMPLETED;
      portfolio.generatedAt = new Date();
      await portfolio.save();

      return res.status(200).json({
        success: true,
        message: `${reportType === 'career' ? 'Career' : 'Development'} report generated successfully`,
        data: { portfolio },
      });
    } catch (genError: any) {
      portfolio.status = PortfolioStatus.FAILED;
      portfolio.generationError = genError.message;
      await portfolio.save();
      throw genError;
    }
  } catch (error: any) {
    console.error('Generate portfolio error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate portfolio',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// 4. GET PORTFOLIOS FOR A REGISTRATION
// ─────────────────────────────────────────────────────────────────────────
export const getPortfolios = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;
    const portfolios = await Portfolio.find({ registrationId }).lean().exec();
    return res.status(200).json({
      success: true,
      data: { portfolios },
    });
  } catch (error: any) {
    console.error('Get portfolios error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch portfolios' });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// 5. DOWNLOAD PORTFOLIO FILE
// ─────────────────────────────────────────────────────────────────────────
export const downloadPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { portfolioId } = req.params;
    const portfolio = await Portfolio.findById(portfolioId).lean().exec();

    if (!portfolio || !portfolio.filePath) {
      res.status(404).json({ success: false, message: 'Portfolio not found' });
      return;
    }

    const filePath = path.join(process.cwd(), portfolio.filePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: 'File not found on server' });
      return;
    }

    res.download(filePath, portfolio.fileName);
  } catch (error: any) {
    console.error('Download portfolio error:', error);
    res.status(500).json({ success: false, message: 'Failed to download portfolio' });
  }
};

// ═════════════════════════════════════════════════════════════════════════
// MULTI-AGENT REPORT GENERATION (ported from Python LangGraph)
// ═════════════════════════════════════════════════════════════════════════

interface ReportState {
  reportType: string;
  inputs: Record<string, any>;
  sectionsToGenerate: string[];
  generatedSections: { name: string; content: string }[];
}

async function generateReportWithAgents(
  reportType: PortfolioType,
  brainData: any,
  careerRolesStr: string,
): Promise<string> {
  // Build inputs object similar to Python version
  const inputs: Record<string, any> = {
    sname: brainData.studentName,
    standard: brainData.standard,
    board: brainData.board || 'NA',
    highest_skills: brainData.highestSkills.map((s: SkillWithPercentage) => s.name),
    skillpercentages: Object.fromEntries(brainData.highestSkills.map((s: SkillWithPercentage) => [s.name, s.percentage])),
    thinking_pattern: brainData.thinkingPattern,
    achievement_style: brainData.achievementStyle.map((s: SkillWithPercentage) => s.name),
    achievementpercentages: Object.fromEntries(brainData.achievementStyle.map((s: SkillWithPercentage) => [s.name, s.percentage])),
    learning_communication_style: brainData.learningCommunicationStyle.map((s: SkillWithPercentage) => s.name),
    learningpercentages: Object.fromEntries(brainData.learningCommunicationStyle.map((s: SkillWithPercentage) => [s.name, s.percentage])),
    quotients: brainData.quotients.map((s: SkillWithPercentage) => s.name),
    quotientpercentages: Object.fromEntries(brainData.quotients.map((s: SkillWithPercentage) => [s.name, s.percentage])),
    personality_type: brainData.personalityType,
    career_roles: careerRolesStr,
  };

  // Determine sections
  const sections =
    reportType === 'career'
      ? [
          '1. Detailed Career Role Breakdown',
          '2. Industry Specific Requirements',
          '3. Emerging Trends and Future Job Prospects',
          '4. Recommended Internships',
          '5. Professional Networking and Industry Associations',
          '6. Guidelines for Progress Monitoring & Support',
        ]
      : [
          '1. Academic Interventions',
          '2. Non-Academic Interventions',
          '3. Habit Reengineering',
          '4. Physical Grooming',
          '5. Psychological Grooming',
          '6. Suggested Reading',
          '7. Health Discipline',
        ];

  const prompts = generateSectionPrompts(reportType, inputs, sections);
  const client = getOpenAIClient();
  const generatedSections: { name: string; content: string }[] = [];

  for (let i = 0; i < sections.length; i++) {
    const sectionName = sections[i];
    const sectionPrompt = prompts[i];
    let retries = 0;
    let content = '';

    while (retries < 3) {
      try {
        console.log(`[GENERATOR] Section ${i + 1}/${sections.length}: ${sectionName} (attempt ${retries + 1})`);
        const resp = await client.chat.completions.create({
        //   model: 'gpt-4o',
          model: 'gpt-5.2',
          messages: [
            {
              role: 'system',
              content:
                'You are academic and career expert having more than 35 years of experience with deep knowledge in psychology, career development, and personalized education planning. You MUST strictly follow the career roles provided. Do NOT suggest different roles. Do NOT use emojis or decorative symbols like * or # in the content.',
            },
            { role: 'user', content: sectionPrompt },
          ],
          temperature: 0.7,
        //   max_tokens: 8000,
          max_completion_tokens: 15000
        });

        content = resp.choices[0]?.message?.content?.trim() || '';

        // Validate
        if (content.length < 100) {
          retries++;
          continue;
        }

        // Special validation for Health Discipline
        if (sectionName === '7. Health Discipline') {
          const lower = content.toLowerCase();
          if (!['food', 'sleeping discipline', 'hydration', 'lifestyle'].every(c => lower.includes(c))) {
            retries++;
            continue;
          }
        }

        break; // Passed validation
      } catch (err: any) {
        console.error(`[GENERATOR] Error for ${sectionName}:`, err.message);
        retries++;
        if (retries >= 3) content = `${sectionName}\n\nContent generation failed.`;
      }
    }

    generatedSections.push({ name: sectionName, content });
  }

  return generatedSections.map(s => s.content).join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────
// Section prompt builder (ported from Python)
// ─────────────────────────────────────────────────────────────────────────
function generateSectionPrompts(reportType: string, inputs: Record<string, any>, sections: string[]): string[] {
  const skillGuidance = buildSkillActionGuidance(
    (inputs.highest_skills || []).map((name: string) => ({
      name,
      percentage: inputs.skillpercentages?.[name] || 0,
    })),
  );

  const basePrompt = `Based on the following student profile information, you will write ONLY ONE of the requested sections of the report each time. Do not repeat the input data in the output.

INPUT DATA:
- Standard / Year: ${inputs.standard || 'NA'}
- Board: ${inputs.board || 'NA'}
- Highest Skills with Percentages: ${formatSkillsWithPercentages(
    (inputs.highest_skills || []).map((n: string) => ({ name: n, percentage: inputs.skillpercentages?.[n] || 0 })),
  )}
- Thinking Pattern: ${inputs.thinking_pattern || 'NA'}
- Achievement Style with Percentages: ${formatSkillsWithPercentages(
    (inputs.achievement_style || []).map((n: string) => ({ name: n, percentage: inputs.achievementpercentages?.[n] || 0 })),
  )}
- Learning Communication Style with Percentages: ${formatSkillsWithPercentages(
    (inputs.learning_communication_style || []).map((n: string) => ({ name: n, percentage: inputs.learningpercentages?.[n] || 0 })),
  )}
- Quotients with Percentages: ${formatSkillsWithPercentages(
    (inputs.quotients || []).map((n: string) => ({ name: n, percentage: inputs.quotientpercentages?.[n] || 0 })),
  )}
- Personality Type: ${inputs.personality_type || 'NA'}
- Suggested Career Roles: ${inputs.career_roles || 'NA'}

CRITICAL AGE/LEVEL ADAPTATION RULE:
You MUST adapt all advice to the student's Standard/Year.
- If the student is in school (e.g., 6th-12th): focus on school-level actions, subject foundations, study routines, age-appropriate internships/projects (mini-projects), and parent/teacher support.
- If the student is in college (e.g., FY/SY/TY/1st-4th year): focus on industry readiness, internships, projects, networking, resume/portfolio, and placement preparation.
Do NOT give college-level internship/placement advice to an 8th/9th student.
Do NOT give school timetable advice to a final-year college student.

CRITICAL INSTRUCTION - CAREER ROLE FOCUS:
YOU MUST USE THE EXACT CAREER ROLES ENTERED BY THE STUDENT: ${inputs.career_roles || 'NA'}
DO NOT CHANGE OR SUGGEST DIFFERENT ROLES.
The ENTIRE report must be centered around THESE EXACT ROLES ONLY.
If multiple roles are mentioned, you MUST:
  - Address ALL roles mentioned by the student
  - Create separate subsections for each role where appropriate
Every recommendation must be DIRECTLY relevant to the entered roles.
Do NOT provide generic career advice. Do NOT suggest alternative roles.

${skillGuidance}

BOARD CONTEXT RULE:
You MUST adapt learning methods, practice strategies, and execution according to the student's academic Board.
CBSE: emphasize NCERT-based conceptual clarity, structured syllabus progression, exam-oriented practice.
ICSE: emphasize detailed conceptual understanding, strong language and writing skills, descriptive answer structuring.
State Board: emphasize board-pattern questions, strengthening core fundamentals, bridging gaps toward national-level standards.
IB / Cambridge: emphasize inquiry-based learning, conceptual depth, project and research work, independent thinking.
Keep recommendations practical and appropriate to the board.

NON-NEGOTIABLE OUTPUT RULES:
- BE CONCISE AND DIRECT. NO lengthy explanations or verbose paragraphs.
- Use BULLET POINTS for all lists and action items.
- Each bullet should be 1-2 lines maximum.
- NO introductory or concluding paragraphs.
- Get straight to the actionable information.
- TOTAL section length: 200-350 words maximum.
- Do NOT use emojis or decorative symbols like * or #.
- Format with clear subheadings for each role if multiple roles exist.

FORMAT REQUIREMENTS:
- First line must be the exact section heading.
- Organize content with concise subheadings.
- Use bullet points starting with '- ' for all lists.
- Keep explanations minimal - focus on facts and action items.

`;

  // Section-specific blueprints (aligned with app.py)
  const blueprints: Record<string, string> = {
    '1. Detailed Career Role Breakdown': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

CRITICAL INSTRUCTION:
For EACH entered career role, you MUST expand it into 10 DIFFERENT SPECIFIC JOB ROLES that fall under that career category.

For example:
- If the entered career role is 'Software Engineer', provide 10 specific job roles like:
  Backend Developer, Frontend Developer, Full Stack Developer, DevOps Engineer, Mobile App Developer,
  Cloud Solutions Architect, Data Engineer, QA Automation Engineer, Site Reliability Engineer, Security Engineer

For EACH of the 10 specific job roles, output in this EXACT format:

Job Role: [Specific Job Role Name]
Technical Skills: [comma-separated list]
Soft Skills: [comma-separated list]
Undergraduate Education: [degree name]
Postgraduate Education: [degree name]
Micro-degrees: [comma-separated certifications]
Certifications: [comma-separated list]
Career Progression: [progression path with arrows]
Salary Range: [amount and currency]
Day-to-Day Responsibilities: [comma-separated list]

MANDATORY RULES:
- Generate EXACTLY 10 specific job roles for EACH entered career role
- Each job role must be DISTINCT and SPECIFIC (not generic)
- Provide COMPLETE information for all 9 fields for each job role
- DO NOT CREATE MARKDOWN TABLES. DO NOT USE PIPES |`,

    '2. Industry Specific Requirements': `SECTION-SPECIFIC REQUIREMENTS:
- For EACH career role, organize requirements in BEGINNER -> ADVANCED progression
- Structure for each role:

For [Career Role Name]:

Beginner Level:
- Certification Name: [Name]
- Application Process: Step-by-step how to apply (registration website, prerequisites, exam format)
- Duration: Time to complete
- Assistance Resources: Where to get help (official courses, study materials, forums, coaching)

Intermediate Level:
[same format]

Advanced Level:
[same format]

- Include ALL important details: registration links, prerequisites, exam format, study resources, cost
- Be SPECIFIC and ACTIONABLE`,

    '3. Emerging Trends and Future Job Prospects': `SECTION-SPECIFIC REQUIREMENTS:
- Determine the CURRENT YEAR dynamically.
- Define time ranges:
  Past Trend: Previous 3 completed years
  Present Trend: Current Year
  Future Prediction: Next 3 years

- For EACH career role, create a separate subsection with heading:
  For [Career Role Name]:

- Then provide a MARKDOWN TABLE using pipe | separators with this EXACT format:

| Aspect | Past Trend (Previous 3 Years) | Present Trend (Current Year) | Future Prediction (Next 3 Years) |
|--------|-------------------------------|------------------------------|----------------------------------|
| Job Demand Growth | ... | ... | ... |
| Average Salary Trends | ... | ... | ... |
| Key Technologies/Skills | ... | ... | ... |
| Industry Adoption Rate | ... | ... | ... |
| Geographic Demand | ... | ... | ... |

- YOU MUST use pipe | delimiters for the table. DO NOT use bullet points or plain text for the table data.
- Include the separator row (|---|---|---|---|) after the header.
- Include statistical data: job growth %, salary trends, technology adoption rates.
- Use realistic, conservative estimates aligned with reputable industry reports.
- If exact figures are unavailable, provide clearly stated approximate ranges.
- Create a SEPARATE table for EACH career role.`,

    '4. Recommended Internships': `SECTION-SPECIFIC REQUIREMENTS:
- Organize by CAREER ROLE with clear role headings (e.g. "For [Career Role Name]:")
- For each role, provide 5-8 internship entries in this EXACT key-value format:

Internship Type: [Specific internship position name]
Industries: Small: [2-3 types]; Medium: [2-3 types]; Large: [2-3 types]
Expected Outcomes: [outcome 1], [outcome 2], [outcome 3], [outcome 4]

CRITICAL FORMAT RULES:
- Each entry MUST have exactly 3 fields: Internship Type, Industries, Expected Outcomes
- "Industries:" MUST be on a SINGLE LINE with Small/Medium/Large separated by semicolons
- "Expected Outcomes:" MUST be on a SINGLE LINE, comma-separated (NOT as bullet points on separate lines)
- DO NOT put Expected Outcomes as bullet points (- ) on separate lines
- Leave a blank line between each internship entry
- DO NOT use 'Point 1', 'Point 2' - use meaningful internship type names
- Include application pipeline advice at the end`,

    '5. Professional Networking and Industry Associations': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

For EACH entered career role, output in this EXACT format:

For [Career Role Name]:

Professional Associations:
- [Association 1-5]

Industry Events:
- [Event/Conference 1-5]

Networking Strategy:
- [Strategy 1-5]

DO NOT CREATE MARKDOWN TABLES. DO NOT USE PIPES |
Use bullet points (- ) for each item.`,

    '6. Guidelines for Progress Monitoring & Support': `SECTION-SPECIFIC REQUIREMENTS:
- Create a HORIZONTAL comparison table with this structure:
  | Aspect | [Career Role 1] | [Career Role 2] |
- Rows (Aspects) should include:
  Strategy, Observation, Balance, Intellect, Expression, Execution, KPIs, Mentorship, Self-Assessment, Feedback Loops
- This format allows EASY COMPARISON across all career roles
- Keep each cell concise but actionable (2-3 sentences max)`,

    '1. Academic Interventions': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Create a 3-year academic intervention plan WITH CONTENT FOR EVERY SINGLE MONTH (all 12 months each year).

You MUST output in this EXACT line-by-line structure for EVERY month:

Year 1:
- Month: January
  Activity: [what needs to be done]
  Technical Skills: [comma-separated skills]
  Soft Skills: [comma-separated skills]
  Learning Material: [courses, books, platforms]
  Objective: [1-2 line objective]

- Month: February
  Activity: [...]
  Technical Skills: [...]
  Soft Skills: [...]
  Learning Material: [...]
  Objective: [...]

[Continue for ALL 12 months: January through December]

Year 2:
[Same structure for ALL 12 months with different, more advanced content]

Year 3:
[Same structure for ALL 12 months with different, more advanced content]

CRITICAL FORMAT RULES — NON-NEGOTIABLE:
- "- Month: [Name]" MUST be on its OWN LINE.
- Each field (Activity, Technical Skills, etc.) MUST be on its OWN LINE with 2-space indentation.
- DO NOT put multiple fields on a single line separated by spaces.
- DO NOT use markdown tables or pipes |.
- ALL 3 years MUST include ALL 12 months (January through December).
- Each month MUST have all 5 fields: Activity, Technical Skills, Soft Skills, Learning Material, Objective.
- Make each month's content UNIQUE and PROGRESSIVE.`,

    '2. Non-Academic Interventions': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Create a COMPREHENSIVE 3-YEAR NON-ACADEMIC INTERVENTION PLAN focused on PERSONALITY DEVELOPMENT, LIFE SKILLS, SOCIAL INTELLIGENCE, EMOTIONAL MATURITY, DISCIPLINE, ETHICS, HEALTH, AND REAL-WORLD ADAPTABILITY.

These interventions MUST NOT be academic courses. They must focus on experiential learning, behavioral conditioning, exposure-based growth, habit formation, emotional regulation, leadership readiness.

Year 1: Foundation building, self-awareness, discipline, exposure
Year 2: Skill strengthening, responsibility, leadership exposure, stress handling
Year 3: Maturity, strategic thinking, resilience, ethical grounding, real-world readiness

You MUST output in this EXACT line-by-line structure for EVERY month:

Year 1:
- Month: January
  Activity: [non-academic activity focused on behavior/exposure/life skill development]
  Technical Skills: [practical real-world skills - comma-separated]
  Soft Skills: [behavioral skills - comma-separated]
  Learning Outcome: [specific capability developed]
  Objective: [why this activity is included - 1-2 lines]

- Month: February
  Activity: [...]
  Technical Skills: [...]
  Soft Skills: [...]
  Learning Outcome: [...]
  Objective: [...]

[Continue for ALL 12 months: January through December]

Year 2:
[Same structure for ALL 12 months]

Year 3:
[Same structure for ALL 12 months]

CRITICAL FORMAT RULES — NON-NEGOTIABLE:
- "- Month: [Name]" MUST be on its OWN LINE.
- Each field (Activity, Technical Skills, etc.) MUST be on its OWN LINE with 2-space indentation.
- DO NOT put multiple fields on a single line separated by spaces.
- DO NOT output JSON, tables, bullets within fields, or any other format.
- ALL 3 years MUST include ALL 12 months.
- Use 'Learning Outcome' (NOT 'Learning Material' or 'Resources').
- NO academic subjects, exams, degrees, certifications.
- Content must be NON-REPETITIVE and LOGICALLY PROGRESSIVE.`,

    '3. Habit Reengineering': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Design a 3-year habit reengineering plan. AT LEAST 6-7 months per year spread across the year.

Year 1:
- Month: January
  Activity: [habit-building activity]
  Action Plan: [detailed steps to perform the activity]
  Objective: [clear purpose in 1-2 lines]
  Habits to Develop: [comma-separated daily/weekly habits]
  Soft Skills: [comma-separated]
  Learning Outcomes: [observable outcomes]

- Month: March
  Activity: [...]
  Action Plan: [...]
  Objective: [...]
  Habits to Develop: [...]
  Soft Skills: [...]
  Learning Outcomes: [...]

[Continue for 6-7 months spread across the year]

Year 2: [Same structure - higher responsibility, improved consistency]
Year 3: [Same structure - autonomy, long-term planning, self-discipline]

CRITICAL FORMAT RULES — NON-NEGOTIABLE:
- "- Month: [Name]" MUST be on its OWN LINE.
- Each field MUST be on its OWN LINE with 2-space indentation.
- DO NOT put multiple fields on a single line separated by spaces.
- Use EXACT field names: Month, Activity, Action Plan, Objective, Habits to Develop, Soft Skills, Learning Outcomes.
- Each month's content must be UNIQUE and PROGRESSIVE.`,

    '4. Physical Grooming': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Create a 3-year PHYSICAL GROOMING PLAN focused on HEALTH, DISCIPLINE, ENERGY MANAGEMENT, POSTURE, PROFESSIONAL PRESENCE, AND STRESS REGULATION.
AT LEAST 6-7 months per year spread across the year.

Year 1:
- Month: January
  Activity: [physical grooming activity]
  Objective: [how this builds discipline/confidence]
  Physical & Mental Skills Developed: [comma-separated]
  Soft Skills: [comma-separated]
  Learning Outcomes: [outcomes]

- Month: April
  Activity: [...]
  Objective: [...]
  Physical & Mental Skills Developed: [...]
  Soft Skills: [...]
  Learning Outcomes: [...]

[Continue for 6-7 months spread across the year]

Year 2: [Same structure - improved stamina, posture, stress tolerance]
Year 3: [Same structure - maturity, self-management, leadership presence]

CRITICAL FORMAT RULES — NON-NEGOTIABLE:
- "- Month: [Name]" MUST be on its OWN LINE.
- Each field MUST be on its OWN LINE with 2-space indentation.
- DO NOT put multiple fields on a single line separated by spaces.
- Use EXACT field names: Month, Activity, Objective, Physical & Mental Skills Developed, Soft Skills, Learning Outcomes.`,

    '5. Psychological Grooming': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Create a 3-year PSYCHOLOGICAL GROOMING PLAN focused on EMOTIONAL REGULATION, MENTAL CLARITY, STRESS MANAGEMENT, RESILIENCE, DECISION-MAKING, AND SELF-DISCIPLINE.
AT LEAST 6-7 months per year spread across the year.

Year 1:
- Month: January
  Activity: [psychological grooming activity]
  Objective: [how this improves mental stability/focus]
  Psychological Skills Developed: [comma-separated]
  Soft Skills: [comma-separated]
  Learning Outcomes: [outcomes]

- Month: February
  Activity: [...]
  Objective: [...]
  Psychological Skills Developed: [...]
  Soft Skills: [...]
  Learning Outcomes: [...]

[Continue for 6-7 months spread across the year]

Year 2: [Same structure - stress resilience, decision-making maturity]
Year 3: [Same structure - psychological maturity, self-regulation]

CRITICAL FORMAT RULES — NON-NEGOTIABLE:
- "- Month: [Name]" MUST be on its OWN LINE.
- Each field MUST be on its OWN LINE with 2-space indentation.
- DO NOT put multiple fields on a single line separated by spaces.
- Use EXACT field names: Month, Activity, Objective, Psychological Skills Developed, Soft Skills, Learning Outcomes.`,

    '6. Suggested Reading': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

Provide AT LEAST 15 books (aim for 18-20).

CRITICAL BOOK SELECTION RULES:
- ALL books MUST be AVAILABLE IN INDIA (Amazon India, Flipkart).
- DO NOT HALLUCINATE or make up book titles. ONLY suggest REAL, VERIFIED, FAMOUS books.
- BALANCED MIX: 50-60% Technical/Domain, 40-50% Soft Skills.

OUTPUT FORMAT:

TECHNICAL/DOMAIN BOOKS (8-10 books):

- Book Name: [title]
  Author: [author name]
  Publication: [publisher]
  Availability in India: [Amazon India/Flipkart]
  Why Should This Book Be Read?: [1-2 lines specific to career]

SOFT SKILLS & PROFESSIONAL DEVELOPMENT BOOKS (7-10 books):
[Same format]

CRITICAL RULES:
- MINIMUM 15 books.
- Each book MUST include all 5 fields.
- Make 'Why Should This Book Be Read?' specific to their career/skills.
- No markdown tables, no pipes.`,

    '7. Health Discipline': `SECTION-SPECIFIC REQUIREMENTS - OUTPUT STRUCTURED FORMAT (NOT MARKDOWN TABLE):

CRITICAL: You MUST provide recommendations for ALL FOUR categories:

CATEGORY 1: FOOD (6-8 recommendations)
- Category: Food
  Recommendation: [specific food/meal]
  Benefits for Mental Health: [1-2 lines]
  Benefits for Physical Health: [1-2 lines]

Include Indian food context: Besan Chilla, Paneer Paratha, Dal, Roti, Khichdi, Warm Milk with Turmeric, etc.

CATEGORY 2: SLEEPING DISCIPLINE (5-6 recommendations)
- Category: Sleeping Discipline
  Recommendation: [specific practice]
  Benefits for Mental Health: [1-2 lines]
  Benefits for Physical Health: [1-2 lines]

CATEGORY 3: HYDRATION (4-5 recommendations)
- Category: Hydration
  Recommendation: [specific hydration practice]
  Benefits for Mental Health: [1-2 lines]
  Benefits for Physical Health: [1-2 lines]

CATEGORY 4: LIFESTYLE (5-6 recommendations)
- Category: Lifestyle
  Recommendation: [specific lifestyle practice]
  Benefits for Mental Health: [1-2 lines]
  Benefits for Physical Health: [1-2 lines]

FINAL CHECK: ALL 4 categories are MANDATORY. Do not skip any.
Each recommendation MUST have all 4 fields: Category, Recommendation, Benefits for Mental Health, Benefits for Physical Health.
No markdown tables, no pipes.`,
  };

  return sections.map(section => {
    const blueprint = blueprints[section] || '';
    return `${basePrompt}${blueprint}\nWRITE ONLY THE FOLLOWING SECTION, using the exact heading text as the first line:\n${section}\n`;
  });
}

// ─────────────────────────────────────────────────────────────────────────
// DOCX GENERATION with proper Tables (aligned with Python app.py)
// ─────────────────────────────────────────────────────────────────────────

// Unified blue color theme (applied to ALL sections)
const BLUE_THEME = { header: '1565C0', altRow: 'DBEAFE', accent: '2563EB' };
const SECTION_COLORS: Record<string, { header: string; altRow: string; accent: string }> = {
  profile:      BLUE_THEME,
  career:       BLUE_THEME,
  industry:     BLUE_THEME,
  trends:       BLUE_THEME,
  internship:   BLUE_THEME,
  networking:   BLUE_THEME,
  guidelines:   BLUE_THEME,
  reading:      BLUE_THEME,
  health:       BLUE_THEME,
  default:      BLUE_THEME,
  academic:     BLUE_THEME,
  nonacademic:  BLUE_THEME,
  habit:        BLUE_THEME,
  physical:     BLUE_THEME,
  psychological:BLUE_THEME,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSectionColor(_sectionLower: string): { header: string; altRow: string; accent: string } {
  return BLUE_THEME;
}

// Helper: strip emojis and decorative symbols from AI output
function removeEmojisAndAsterisks(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}]/gu, '').replace(/\*/g, '').replace(/###\s*/g, '');
}

// Helper: create a styled table cell with optional multi-line support
function makeCell(text: string, docx: any, opts: { bold?: boolean; shading?: string; width?: number; color?: string; multiLine?: boolean } = {}) {
  const { Paragraph, TextRun, TableCell, WidthType, ShadingType } = docx;
  const paragraphs: any[] = [];

  if (opts.multiLine && text.includes('\n')) {
    const lines = text.split('\n');
    for (const line of lines) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.trim(), bold: opts.bold || false, size: 18, font: 'Calibri', color: opts.color })],
        spacing: { before: 20, after: 20 },
      }));
    }
  } else {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: text || '', bold: opts.bold || false, size: 18, font: 'Calibri', color: opts.color })],
      spacing: { before: 40, after: 40 },
    }));
  }

  const cellOpts: any = { children: paragraphs };
  if (opts.shading) {
    cellOpts.shading = { type: ShadingType.CLEAR, fill: opts.shading };
  }
  if (opts.width) {
    cellOpts.width = { size: opts.width, type: WidthType.PERCENTAGE };
  }
  return new TableCell(cellOpts);
}

// Helper: create header row for a table with custom color
function makeHeaderRow(headers: string[], docx: any, headerColor?: string) {
  const { TableRow, Paragraph, TextRun, TableCell, ShadingType } = docx;
  const fill = headerColor || '4472C4';
  return new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
        spacing: { before: 60, after: 60 },
      })],
      shading: { type: ShadingType.CLEAR, fill },
    })),
  });
}

// Parse markdown-style tables ( | col1 | col2 | )
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 2) return null;

  const parseLine = (line: string): string[] =>
    line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length);

  const headers = parseLine(lines[0]);
  if (headers.length === 0) return null;

  const dataStartIdx = lines[1].includes('---') ? 2 : 1;
  const rows: string[][] = [];
  for (let i = dataStartIdx; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.length > 0) rows.push(cells);
  }

  return rows.length > 0 ? { headers, rows } : null;
}

// Parse year-block structured output (Month/Activity/fields)
// Month names for detection
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_REGEX = new RegExp(`^-?\\s*(${MONTH_NAMES.join('|')})\\b`, 'i');

/**
 * Parse inline month entry like:
 *   "January  Activity: foo  Technical Skills: bar  Soft Skills: baz"
 * into { Month: "January", Activity: "foo", "Technical Skills": "bar", ... }
 */
function parseInlineMonthLine(line: string): Record<string, string> | null {
  const monthMatch = line.match(MONTH_REGEX);
  if (!monthMatch) return null;
  const monthName = MONTH_NAMES.find(m => m.toLowerCase() === monthMatch[1].toLowerCase()) || monthMatch[1];
  const rest = line.slice(monthMatch[0].length).trim();
  const record: Record<string, string> = { Month: monthName };
  if (!rest) return record;

  // Split rest by "  FieldName:" patterns (2+ spaces then word chars + colon)
  const fieldPattern = /\s{2,}([A-Za-z][A-Za-z &'/,()]+):\s*/g;
  let lastIndex = 0;
  let lastKey: string | null = null;
  let match: RegExpExecArray | null;

  // First, try to match a leading key "FieldName: value" at the very start of rest
  const leadingKv = rest.match(/^([A-Za-z][A-Za-z &'/,()]+):\s*(.*)/);
  if (leadingKv) {
    lastKey = leadingKv[1].trim();
    lastIndex = leadingKv[1].length + 1 + (rest.match(/^[^:]+:\s*/) || [''])[0].length - leadingKv[1].length - 1;
    // Reset and use the split approach on full rest
  }

  // Use split-by-field approach: find all "FieldName:" positions
  const allMatches: { key: string; start: number }[] = [];
  const scanRest = rest;
  const scanRegex = /(?:^|\s{2,})([A-Za-z][A-Za-z &'/,()]+):\s*/g;
  let m2: RegExpExecArray | null;
  while ((m2 = scanRegex.exec(scanRest)) !== null) {
    allMatches.push({ key: m2[1].trim(), start: m2.index + m2[0].length - (m2[0].match(/\S.*/) || [''])[0].length + m2[1].length + 1 });
  }

  if (allMatches.length === 0) {
    // No fields found — whole rest is activity or unknown
    if (rest) record['Activity'] = rest;
    return record;
  }

  // Rebuild by splitting properly
  // Use regex to split rest into [key, value] pairs
  const parts = scanRest.split(/\s{2,}(?=[A-Za-z][A-Za-z &'/,()]+:\s*)/);
  for (const part of parts) {
    const kv = part.match(/^([A-Za-z][A-Za-z &'/,()]+):\s*([\s\S]*)$/);
    if (kv) {
      record[kv[1].trim()] = kv[2].trim();
    } else if (part.trim()) {
      // Leading text without a key — treat as Activity
      record['Activity'] = part.trim();
    }
  }

  return record;
}

function parseYearBlocks(content: string): { year: string; months: Record<string, string>[] }[] {
  const years: { year: string; months: Record<string, string>[] }[] = [];
  let currentYear: { year: string; months: Record<string, string>[] } | null = null;
  let currentMonth: Record<string, string> | null = null;
  let lastKey = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    // Match "Year 1:" or "Year 1" or "Year 1 - something"
    const yearMatch = line.match(/^Year\s+(\d+)/i);
    if (yearMatch && !line.includes(':') || line.match(/^Year\s+\d+:?\s*$/i)) {
      currentYear = { year: `Year ${yearMatch![1]}`, months: [] };
      years.push(currentYear);
      currentMonth = null;
      lastKey = '';
      continue;
    }

    // Skip descriptive lines between years that aren't field data (e.g. "Year 2: Higher responsibility...")
    const yearDescMatch = line.match(/^Year\s+\d+:\s+.{10,}/);
    if (yearDescMatch) {
      if (!currentYear) {
        const numMatch = line.match(/^Year\s+(\d+)/);
        if (numMatch) {
          currentYear = { year: `Year ${numMatch[1]}`, months: [] };
          years.push(currentYear);
        }
      }
      continue;
    }

    // Match "- Month: January" format
    const monthMatch = line.match(/^-?\s*Month:\s*(.+)$/i);
    if (monthMatch && currentYear) {
      currentMonth = { Month: monthMatch[1].trim() };
      currentYear.months.push(currentMonth);
      lastKey = 'Month';
      continue;
    }

    // ── NEW: detect standalone month name (e.g. "January" or "- January") either alone or with inline fields ──
    const inlineParsed = parseInlineMonthLine(line);
    if (inlineParsed && currentYear) {
      // If it has more than just Month it is an inline full entry — add directly
      if (Object.keys(inlineParsed).length > 1) {
        currentYear.months.push(inlineParsed);
        currentMonth = inlineParsed;
        lastKey = Object.keys(inlineParsed).slice(-1)[0] || 'Month';
      } else {
        // Standalone month name — start a new month block, fields follow on next lines
        currentMonth = inlineParsed;
        currentYear.months.push(currentMonth);
        lastKey = 'Month';
      }
      continue;
    }

    if (currentMonth) {
      // Match "  FieldName: value" with potential leading whitespace/dash
      // Allow empty value (captured as empty string) so the key is registered for subsequent bullets
      const fieldMatch = line.match(/^(?:-|●|\*)?\s*([A-Za-z][A-Za-z &'/,()]+):\s*(.*)$/);
      if (fieldMatch) {
        const key = fieldMatch[1].trim();
        const val = fieldMatch[2].trim();
        // Skip year/level heading lines re-encountered mid-block
        if (/^(beginner|intermediate|advanced|year\s+\d)/i.test(key)) continue;
        currentMonth[key] = val;
        lastKey = key;
      } else if ((line.startsWith('-') || line.startsWith('●') || line.startsWith(',')) && lastKey && lastKey !== 'Month') {
        // Continuation bullet appended to last field
        currentMonth[lastKey] += (currentMonth[lastKey] ? '; ' : '') + line.replace(/^[-●,]\s*/, '');
      }
    }
  }

  return years;
}

// Parse key-value blocks (for Career Breakdown, Health Discipline, Suggested Reading, Internships)
function parseKeyValueBlocks(content: string): Record<string, string>[][] {
  const blocks: Record<string, string>[][] = [];
  let currentGroup: Record<string, string>[] = [];
  let currentBlock: Record<string, string> | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      if (currentBlock && Object.keys(currentBlock).length > 0) {
        currentGroup.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    // Skip markdown table lines
    if (line.startsWith('|')) continue;

    // Detect section subheadings
    if (/^(For\s+.+:|.*BOOKS.*:|CATEGORY\s+\d+:.*|=====.+=====)$/i.test(line)) {
      if (currentBlock && Object.keys(currentBlock).length > 0) {
        currentGroup.push(currentBlock);
        currentBlock = null;
      }
      if (currentGroup.length > 0) {
        blocks.push(currentGroup);
        currentGroup = [];
      }
      continue;
    }

    // Match key-value lines (with possible leading bullet/number)
    // Allow empty value after colon (e.g. "Expected Outcomes:" with bullets on next lines)
    const kvMatch = line.match(/^(?:[-●]\s*)?([A-Za-z &'/?,()]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = (kvMatch[2] || '').trim();

      // Skip lines that look like subheadings (e.g., "Beginner Level:", "Year 1:")
      if (/^(beginner|intermediate|advanced|year\s+\d)/i.test(key)) {
        continue;
      }

      const startKeys = ['job role', 'career role', 'book name', 'category', 'certification name', 'internship type'];
      if (startKeys.some(sk => key.toLowerCase() === sk)) {
        if (currentBlock && Object.keys(currentBlock).length > 0) {
          currentGroup.push(currentBlock);
        }
        currentBlock = { [key]: value };
      } else {
        if (!currentBlock) currentBlock = {};
        currentBlock[key] = value;
      }
    } else if ((line.startsWith('- ') || line.startsWith('● ')) && currentBlock) {
      const lastKey = Object.keys(currentBlock).pop();
      if (lastKey) currentBlock[lastKey] += '; ' + line.replace(/^[-●]\s*/, '');
    }
  }
  if (currentBlock && Object.keys(currentBlock).length > 0) currentGroup.push(currentBlock);
  if (currentGroup.length > 0) blocks.push(currentGroup);

  return blocks;
}

function buildDocxSections(content: string, reportType: string, brainData: any, careerRolesStr: string, docx: any) {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = docx;

  const children: any[] = [];

  // Title with styled text
  const titleText = reportType === 'career' ? 'Career Development Report' : 'Personal Development & Intervention Report';
  children.push(
    new Paragraph({
      children: [new TextRun({ text: titleText, bold: true, size: 36, font: 'Calibri', color: '2E4057' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  );

  // Colored divider line
  children.push(new Table({
    rows: [new TableRow({
      children: [new TableCell({
        children: [new Paragraph({ text: '', spacing: { before: 0, after: 0 } })],
        shading: { type: ShadingType.CLEAR, fill: '3B82F6' },
      })],
    })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));

  // Date
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, color: '808080', size: 20, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 200 },
    }),
  );

  // ── Student Profile Summary as a Table ──
  const profColor = SECTION_COLORS.profile;
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Student Profile Summary', bold: true, size: 28, font: 'Calibri', color: profColor.header })],
    spacing: { after: 120 },
  }));

  const profileData = [
    ['Name', brainData.studentName || 'NA'],
    ['Standard / Year', brainData.standard || 'NA'],
    ['Board', brainData.board || 'NA'],
    ['Highest Skills', formatSkillsWithPercentages(brainData.highestSkills)],
    ['Thinking Pattern', brainData.thinkingPatternDetails?.length
      ? formatSkillsWithPercentages(brainData.thinkingPatternDetails) + ` (Dominant: ${brainData.thinkingPattern || 'NA'})`
      : brainData.thinkingPattern || 'NA'],
    ['Achievement Style', formatSkillsWithPercentages(brainData.achievementStyle)],
    ['Learning & Communication Style', formatSkillsWithPercentages(brainData.learningCommunicationStyle)],
    ['Quotients', formatSkillsWithPercentages(brainData.quotients)],
    ['Personality Type', brainData.personalityType || 'NA'],
    ['Selected Career Roles', careerRolesStr],
  ];

  const profileRowsFinal = profileData.map(([label, value], idx) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })], spacing: { before: 50, after: 50 } })],
          shading: { type: ShadingType.CLEAR, fill: profColor.header },
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: 'Calibri' })], spacing: { before: 50, after: 50 } })],
          shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: profColor.altRow } : undefined,
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  );

  children.push(new Table({
    rows: profileRowsFinal,
    width: { size: 100, type: WidthType.PERCENTAGE },
  }));
  children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

  // ── Detailed Report Sections ──
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Detailed Report', bold: true, size: 30, font: 'Calibri', color: '2E4057' })],
    spacing: { after: 100 },
  }));

  // Clean content
  const cleanContent = removeEmojisAndAsterisks(content);

  // Split into sections by double newline + numbered heading
  const sectionChunks = cleanContent.split(/\n\n(?=\d+\.\s+[A-Z])/);

  for (const chunk of sectionChunks) {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) continue;

    const firstNewline = trimmedChunk.indexOf('\n');
    const heading = firstNewline > 0 ? trimmedChunk.substring(0, firstNewline).trim() : trimmedChunk;
    const body = firstNewline > 0 ? trimmedChunk.substring(firstNewline + 1).trim() : '';

    const sectionLower = heading.toLowerCase();
    const colors = getSectionColor(sectionLower);

    // Section heading with colored accent
    if (/^\d+\.\s+[A-Z]/.test(heading)) {
      children.push(new Paragraph({ text: '', spacing: { before: 100, after: 40 } }));
      // Colored accent bar
      children.push(new Table({
        rows: [new TableRow({
          children: [new TableCell({
            children: [new Paragraph({ text: '', spacing: { before: 0, after: 0 } })],
            shading: { type: ShadingType.CLEAR, fill: colors.accent },
          })],
        })],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: heading, bold: true, size: 26, font: 'Calibri', color: colors.header })],
        spacing: { before: 80, after: 100 },
      }));
    }

    if (!body) continue;

    let tableCreated = false;

    // ── 1. CAREER ROLE BREAKDOWN → Horizontal table with all roles as rows ──
    if (sectionLower.includes('career role breakdown') || sectionLower.includes('career breakdown')) {
      const blocks = parseKeyValueBlocks(body);
      const allItems = blocks.flat();
      if (allItems.length > 0) {
        const CAREER_FIELDS = ['Job Role', 'Technical Skills', 'Soft Skills', 'Undergraduate Education', 'Postgraduate Education', 'Certifications', 'Career Progression', 'Salary Range'];
        const availableFields = CAREER_FIELDS.filter(f => allItems.some(item => item[f]));
        if (availableFields.length > 0) {
          const headerRow = makeHeaderRow(availableFields, docx, colors.header);
          const dataRows = allItems.map((item, idx) =>
            new TableRow({
              children: availableFields.map((field, colIdx) => {
                const isFirstCol = colIdx === 0;
                return makeCell(item[field] || '', docx, {
                  bold: isFirstCol,
                  shading: idx % 2 === 0 ? colors.altRow : undefined,
                });
              }),
            }),
          );
          children.push(new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }));
          children.push(new Paragraph({ text: '' }));
          tableCreated = true;
        }
      }
    }

    // ── 2. EMERGING TRENDS → parse per-role subsections, each with its own markdown table ──
    if (!tableCreated && (sectionLower.includes('emerging trend') || sectionLower.includes('future job'))) {
      // Split body into subsections by "For [Role]:" headings
      const subsectionParts = body.split(/(?=^For\s+[A-Z][^\n]+:$)/m);
      let renderedCount = 0;

      const renderTextLine = (trimmed: string) => {
        if (!trimmed) return;
        if (trimmed.startsWith('● ') || trimmed.startsWith('- ')) {
          const bulletText = trimmed.replace(/^[●-]\s*/, '');
          const kvMatch2 = bulletText.match(/^([A-Za-z &/]+):\s*(.+)$/);
          if (kvMatch2) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: kvMatch2[1] + ': ', bold: true, size: 18, font: 'Calibri' }),
                new TextRun({ text: kvMatch2[2], size: 18, font: 'Calibri' }),
              ],
              bullet: { level: 0 },
              spacing: { before: 20, after: 20 },
            }));
          } else {
            children.push(new Paragraph({
              children: [new TextRun({ text: bulletText, size: 18, font: 'Calibri' })],
              bullet: { level: 0 },
              spacing: { before: 20, after: 20 },
            }));
          }
        } else if (/^For\s+[A-Z].+:$/.test(trimmed) || /^[A-Z][^:]+:$/.test(trimmed)) {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed, bold: true, size: 22, font: 'Calibri', color: colors.header })],
            spacing: { before: 80, after: 40 },
          }));
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 18, font: 'Calibri' })],
            spacing: { before: 20, after: 20 },
          }));
        }
      };

      for (const subsection of subsectionParts) {
        if (!subsection.trim()) continue;
        const subLines = subsection.split('\n');
        const firstLine = subLines[0].trim();

        // Render "For [Role]:" heading
        if (/^For\s+[A-Z].+:$/.test(firstLine)) {
          children.push(new Paragraph({
            children: [new TextRun({ text: firstLine, bold: true, size: 22, font: 'Calibri', color: colors.header })],
            spacing: { before: 100, after: 40 },
          }));
        }

        // Collect pipe lines (markdown table) and non-pipe lines separately
        const pipeLines: string[] = [];
        const nonPipeLines: string[] = [];
        let inTable = false;
        const tableGroups: string[][] = [];
        let currentTableGroup: string[] = [];

        for (const line of subLines) {
          const t = line.trim();
          if (t.startsWith('|')) {
            if (!inTable) {
              inTable = true;
              currentTableGroup = [];
            }
            currentTableGroup.push(t);
          } else {
            if (inTable) {
              tableGroups.push([...currentTableGroup]);
              currentTableGroup = [];
              inTable = false;
            }
            if (t && t !== firstLine) nonPipeLines.push(t);
          }
        }
        if (currentTableGroup.length > 0) tableGroups.push(currentTableGroup);

        // Render each table group
        for (const group of tableGroups) {
          const tableText = group.join('\n');
          const mdTable = parseMarkdownTable(tableText);
          if (mdTable && mdTable.headers.length > 0 && mdTable.rows.length > 0) {
            const headerRow = makeHeaderRow(mdTable.headers, docx, colors.header);
            const dataRows = mdTable.rows.map((row, idx) =>
              new TableRow({
                children: row.map((cell, colIdx) =>
                  makeCell(cell, docx, {
                    bold: colIdx === 0,
                    shading: idx % 2 === 0 ? colors.altRow : undefined,
                  }),
                ),
              }),
            );
            children.push(new Table({
              rows: [headerRow, ...dataRows],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }));
            children.push(new Paragraph({ text: '' }));
            renderedCount++;
          }
        }

        // Render non-pipe text lines (bullets, summaries)
        for (const line of nonPipeLines) {
          renderTextLine(line);
        }
      }

      // Only mark as handled if we actually rendered something; otherwise fall to fallback
      if (renderedCount > 0 || subsectionParts.some(s => s.trim())) {
        tableCreated = true;
      }
    }

    // ── 3. INTERNSHIPS → proper 3-column table with multi-line Industries ──
    if (!tableCreated && sectionLower.includes('internship')) {
      const blocks = parseKeyValueBlocks(body);
      const allItems = blocks.flat();
      if (allItems.length > 0) {
        const headerRow = makeHeaderRow(['Internship Type', 'Industries', 'Expected Outcomes'], docx, colors.header);
        const dataRows = allItems.map((item, idx) => {
          const industryParts: string[] = [];
          if (item['Small']) industryParts.push(`Small: ${item['Small']}`);
          if (item['Medium']) industryParts.push(`Medium: ${item['Medium']}`);
          if (item['Large']) industryParts.push(`Large: ${item['Large']}`);
          const baseIndustry = item['Industries'] ? item['Industries'].replace(/;?\s*$/, '') : '';
          const industries = baseIndustry
            ? (industryParts.length ? baseIndustry + '\n' + industryParts.join('\n') : baseIndustry)
            : industryParts.join('\n');

          return new TableRow({
            children: [
              makeCell(item['Internship Type'] || '', docx, { bold: true, shading: idx % 2 === 0 ? colors.altRow : undefined }),
              makeCell(industries || '', docx, { shading: idx % 2 === 0 ? colors.altRow : undefined, multiLine: true }),
              makeCell(item['Expected Outcomes'] || '', docx, { shading: idx % 2 === 0 ? colors.altRow : undefined }),
            ],
          });
        });

        if (dataRows.length > 0) {
          children.push(new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }));
          children.push(new Paragraph({ text: '' }));
          tableCreated = true;
        }
      }
    }

    // ── 4. GUIDELINES FOR PROGRESS MONITORING → Parse markdown table ──
    if (!tableCreated && (sectionLower.includes('guideline') || sectionLower.includes('progress monitoring'))) {
      const mdTable = parseMarkdownTable(body);
      if (mdTable) {
        const headerRow = makeHeaderRow(mdTable.headers, docx, colors.header);
        const dataRows = mdTable.rows.map((row, idx) =>
          new TableRow({
            children: row.map((cell, colIdx) =>
              makeCell(cell, docx, {
                bold: colIdx === 0,
                shading: idx % 2 === 0 ? colors.altRow : undefined,
              }),
            ),
          }),
        );
        children.push(new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
        children.push(new Paragraph({ text: '' }));
        tableCreated = true;
      }
    }

    // ── 5. YEAR-BLOCK sections (Academic, Non-Academic, Habit, Physical, Psychological) ──
    if (!tableCreated && ['academic intervention', 'non-academic intervention', 'habit reengineering', 'physical grooming', 'psychological grooming'].some(s => sectionLower.includes(s))) {
      const yearBlocks = parseYearBlocks(body);
      if (yearBlocks.length > 0 && yearBlocks.some(y => y.months.length > 0)) {
        const sampleMonth = yearBlocks.find(y => y.months.length > 0)?.months[0] || {};
        const fieldKeys = Object.keys(sampleMonth);
        if (fieldKeys.length > 0) {
          for (const yearBlock of yearBlocks) {
            if (yearBlock.months.length === 0) continue;
            children.push(new Paragraph({
              children: [new TextRun({ text: yearBlock.year, bold: true, size: 22, font: 'Calibri', color: colors.header })],
              spacing: { before: 80, after: 60 },
            }));
            const rows = [makeHeaderRow(fieldKeys, docx, colors.header)];
            yearBlock.months.forEach((month, idx) => {
              rows.push(new TableRow({
                children: fieldKeys.map((key, colIdx) =>
                  makeCell(month[key] || '', docx, {
                    bold: colIdx === 0,
                    shading: idx % 2 === 0 ? colors.altRow : undefined,
                  }),
                ),
              }));
            });
            children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            children.push(new Paragraph({ text: '' }));
          }
          tableCreated = true;
        }
      }
    }

    // ── 6. HEALTH DISCIPLINE → grouped table ──
    if (!tableCreated && sectionLower.includes('health discipline')) {
      const blocks = parseKeyValueBlocks(body);
      const allItems = blocks.flat();
      if (allItems.length > 0) {
        const headers = ['Category', 'Recommendation', 'Benefits for Mental Health', 'Benefits for Physical Health'];
        const rows = [makeHeaderRow(headers, docx, colors.header)];
        allItems.forEach((item, idx) => {
          rows.push(new TableRow({
            children: headers.map((h, colIdx) => makeCell(item[h] || '', docx, { bold: colIdx === 0, shading: idx % 2 === 0 ? colors.altRow : undefined })),
          }));
        });
        children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        children.push(new Paragraph({ text: '' }));
        tableCreated = true;
      }
    }

    // ── 7. SUGGESTED READING → books table ──
    if (!tableCreated && sectionLower.includes('suggested reading')) {
      const blocks = parseKeyValueBlocks(body);
      const allItems = blocks.flat();
      if (allItems.length > 0) {
        const headers = ['Book Name', 'Author', 'Publication', 'Availability in India', 'Why Should This Book Be Read?'];
        const availableHeaders = headers.filter(h => allItems.some(item => item[h]));
        if (availableHeaders.length > 0) {
          const rows = [makeHeaderRow(availableHeaders, docx, colors.header)];
          allItems.forEach((item, idx) => {
            rows.push(new TableRow({
              children: availableHeaders.map((h, colIdx) => makeCell(item[h] || '', docx, { bold: colIdx === 0, shading: idx % 2 === 0 ? colors.altRow : undefined })),
            }));
          });
          children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          children.push(new Paragraph({ text: '' }));
          tableCreated = true;
        }
      }
    }

    // ── 8. ANY SECTION with a markdown table that wasn't matched above ──
    if (!tableCreated) {
      const mdTable = parseMarkdownTable(body);
      if (mdTable) {
        const headerRow = makeHeaderRow(mdTable.headers, docx, colors.header);
        const dataRows = mdTable.rows.map((row, idx) =>
          new TableRow({
            children: row.map((cell, colIdx) =>
              makeCell(cell, docx, {
                bold: colIdx === 0,
                shading: idx % 2 === 0 ? colors.altRow : undefined,
              }),
            ),
          }),
        );
        children.push(new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
        children.push(new Paragraph({ text: '' }));

        // Render non-table content as text
        const nonTableLines = body.split('\n').filter(l => !l.trim().startsWith('|') && !l.trim().match(/^\|?-+/));
        for (const line of nonTableLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('For ') && trimmed.endsWith(':')) {
            children.push(new Paragraph({
              children: [new TextRun({ text: trimmed, bold: true, size: 22, font: 'Calibri', color: colors.header })],
              spacing: { before: 60, after: 40 },
            }));
          } else if (trimmed.startsWith('● ') || trimmed.startsWith('- ')) {
            children.push(new Paragraph({
              children: [new TextRun({ text: trimmed.replace(/^[●-]\s*/, ''), size: 18, font: 'Calibri' })],
              bullet: { level: 0 },
            }));
          } else if (/^[A-Z][a-zA-Z &'?/]+:\s/.test(trimmed)) {
            const colonIdx = trimmed.indexOf(':');
            children.push(new Paragraph({
              children: [
                new TextRun({ text: trimmed.substring(0, colonIdx + 1) + ' ', bold: true, size: 18, font: 'Calibri' }),
                new TextRun({ text: trimmed.substring(colonIdx + 1).trim(), size: 18, font: 'Calibri' }),
              ],
            }));
          } else {
            children.push(new Paragraph({
              children: [new TextRun({ text: trimmed, size: 18, font: 'Calibri' })],
            }));
          }
        }
        tableCreated = true;
      }
    }

    // ── FALLBACK: parse as formatted text with bullets and key-value ──
    if (!tableCreated) {
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          children.push(new Paragraph({ text: '' }));
          continue;
        }
        if (trimmed.startsWith('For ') && trimmed.endsWith(':')) {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed, bold: true, size: 22, font: 'Calibri', color: colors.header })],
            spacing: { before: 80, after: 40 },
          }));
        } else if (/^Year\s+\d+:?$/i.test(trimmed)) {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed, bold: true, size: 22, font: 'Calibri', color: colors.header })],
            spacing: { before: 60, after: 40 },
          }));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('● ')) {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed.replace(/^[-●]\s*/, ''), size: 18, font: 'Calibri' })],
            bullet: { level: 0 },
          }));
        } else if (/^[A-Z][a-zA-Z &'?/]+:\s/.test(trimmed)) {
          const colonIdx = trimmed.indexOf(':');
          children.push(new Paragraph({
            children: [
              new TextRun({ text: trimmed.substring(0, colonIdx + 1) + ' ', bold: true, size: 18, font: 'Calibri', color: colors.header }),
              new TextRun({ text: trimmed.substring(colonIdx + 1).trim(), size: 18, font: 'Calibri' }),
            ],
          }));
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: trimmed, size: 18, font: 'Calibri' })],
          }));
        }
      }
    }
  }

  return [{ children }];
}
