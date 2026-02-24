import mongoose from "mongoose";
import dotenv from "dotenv";
import IvyTestQuestion from "./models/ivy/IvyTestQuestion";

dotenv.config();

const questions = [
  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Global Awareness & Leadership Mindset (20 Questions)
  // ═══════════════════════════════════════════════════════════════════
  {
    section: "Global Awareness",
    questionText:
      "A peer-designed project reduces classroom plastic use by 60% but leaves out cafeteria waste. To scale the initiative responsibly, what's your best leadership move?",
    options: [
      { label: "A", text: "Declare success and stop the project" },
      { label: "B", text: "Assign others to handle the cafeteria problem" },
      { label: "C", text: "Analyze cafeteria waste patterns and adapt the model for broader impact" },
      { label: "D", text: "Post success on social media and move on" },
    ],
    correctOption: "C",
    explanation:
      "Responsible scaling involves evidence-based adaptation and inclusion of overlooked impact zones.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your Model UN team's proposal combines climate tech solutions with indigenous community input. A delegate questions the scientific value of traditional knowledge. Your reply should:",
    options: [
      { label: "A", text: "Agree and remove the community's input" },
      { label: "B", text: "Defend with personal belief" },
      { label: "C", text: "Provide case studies where indigenous methods enhanced sustainability" },
      { label: "D", text: "Say that cultural aspects are irrelevant to science" },
    ],
    correctOption: "C",
    explanation:
      "Sophisticated leadership integrates empirical support with inclusive global perspectives.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A tech company offers your robotics team funding—but has been sued for discriminatory practices abroad. What reflects Ivy-aligned integrity?",
    options: [
      { label: "A", text: "Accept funding silently" },
      { label: "B", text: "Investigate the allegations, discuss with the team, and set ethical funding criteria" },
      { label: "C", text: "Take the money and issue a statement later" },
      { label: "D", text: "Ignore the issue, it's irrelevant" },
    ],
    correctOption: "B",
    explanation:
      "Ethical reflection and informed team dialogue demonstrate real-world decision maturity.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your team wants to launch a peer-mental health helpline. What's the most credible, sustainable first step?",
    options: [
      { label: "A", text: "Make a social media page" },
      { label: "B", text: "Begin giving advice immediately" },
      { label: "C", text: "Partner with school counselors for training and supervision" },
      { label: "D", text: "Start anonymously without oversight" },
    ],
    correctOption: "C",
    explanation:
      "Responsible implementation requires expert guidance and safeguarding.",
  },
  {
    section: "Global Awareness",
    questionText:
      "In an inter-school climate debate, your team's argument is strong but lacks comparative data. For a globally relevant case, you should:",
    options: [
      { label: "A", text: "Use emotional language" },
      { label: "B", text: "Cite only Indian examples" },
      { label: "C", text: "Compare policy outcomes across diverse countries with similar climate issues" },
      { label: "D", text: "Ignore the weakness" },
    ],
    correctOption: "C",
    explanation:
      "Global framing + comparative data reflects analytical excellence.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A campaign you co-lead receives criticism for lacking disabled student access. Your best response:",
    options: [
      { label: "A", text: "Justify the original design" },
      { label: "B", text: "Acknowledge and redesign inclusively with affected groups" },
      { label: "C", text: "Delete the campaign page" },
      { label: "D", text: "Say accessibility is not your responsibility" },
    ],
    correctOption: "B",
    explanation:
      "Listening, inclusion, and adaptive redesign showcase mature leadership.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A rural education project offers free laptops but internet access is limited. What approach ensures deeper impact?",
    options: [
      { label: "A", text: "Focus on digital literacy workshops without devices" },
      { label: "B", text: "Distribute laptops only" },
      { label: "C", text: "Combine device access with local teacher training and offline resource design" },
      { label: "D", text: "End the program" },
    ],
    correctOption: "C",
    explanation:
      "Tech access without infrastructure isn't transformational. Holistic design is.",
  },
  {
    section: "Global Awareness",
    questionText:
      "In an international student exchange, a political discussion escalates. Your role as a student moderator is to:",
    options: [
      { label: "A", text: "Let the disagreement continue" },
      { label: "B", text: "Shift focus without resolution" },
      { label: "C", text: "Encourage civil dialogue and refocus on shared goals" },
      { label: "D", text: "Side with one group" },
    ],
    correctOption: "C",
    explanation:
      "Diplomacy and group cohesion are critical Ivy leadership competencies.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A science fair team proposes water purification using advanced nanotech. Their design costs ₹25,000 per unit. You suggest:",
    options: [
      { label: "A", text: "Mass production to reduce cost" },
      { label: "B", text: "Ignoring cost — it's about innovation" },
      { label: "C", text: "Adding a social impact component: cost comparison, scalability, and affordability metrics" },
      { label: "D", text: "Using it only in urban areas" },
    ],
    correctOption: "C",
    explanation:
      "Innovation + social equity = true Ivy-level initiative.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A gender inclusion group proposes an all-girls coding hackathon. Critics argue it's exclusionary. You reply:",
    options: [
      { label: "A", text: "Agree and cancel the idea" },
      { label: "B", text: "Provide evidence on why safe, targeted spaces foster equity in male-dominated fields" },
      { label: "C", text: 'Say "not everyone needs to be included"' },
      { label: "D", text: "Ignore the critics" },
    ],
    correctOption: "B",
    explanation:
      "Defense through evidence and purpose-based inclusivity matters.",
  },
  {
    section: "Global Awareness",
    questionText:
      "You're mentoring younger students. They propose a climate awareness flash mob. To elevate the idea:",
    options: [
      { label: "A", text: "Suggest adding QR codes linking to global resources" },
      { label: "B", text: "Make it louder" },
      { label: "C", text: "Shorten it" },
      { label: "D", text: "Tell them not to do it" },
    ],
    correctOption: "A",
    explanation:
      "Linking creativity with actionable learning deepens real impact.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your school celebrates International Day with cultural booths. One community is misrepresented. You:",
    options: [
      { label: "A", text: "Ignore it" },
      { label: "B", text: "Joke about it" },
      { label: "C", text: "Engage respectfully with organizers and offer to co-create accurate content" },
      { label: "D", text: "Publicly criticize the booth" },
    ],
    correctOption: "C",
    explanation:
      "Correction through collaboration, not shame, reflects intercultural sensitivity.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your friend plagiarizes a powerful speech to win a public speaking event. As co-organizer, you:",
    options: [
      { label: "A", text: "Ignore it to protect the event" },
      { label: "B", text: "Confront them publicly" },
      { label: "C", text: "Discreetly inform judges with evidence" },
      { label: "D", text: "Congratulate them" },
    ],
    correctOption: "C",
    explanation:
      "Integrity demands action—with discretion and documentation.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A student-run magazine wants to publish a political cartoon some consider offensive. As editorial lead, you:",
    options: [
      { label: "A", text: "Approve without discussion" },
      { label: "B", text: "Censor it silently" },
      { label: "C", text: "Convene an editorial board discussion on impact, intent, and standards" },
      { label: "D", text: "Leave it to the principal" },
    ],
    correctOption: "C",
    explanation:
      "Decision-making in complex scenarios needs reflective team process.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your school's Earth Week ends with a large, catered event with disposable plastics. You suggest:",
    options: [
      { label: "A", text: "Let it go — it's a celebration" },
      { label: "B", text: "Cancel the event" },
      { label: "C", text: "Replace catering with student-run sustainable food stalls" },
      { label: "D", text: "Complain to the principal" },
    ],
    correctOption: "C",
    explanation:
      "Positive alternatives = pragmatic environmental leadership.",
  },
  {
    section: "Global Awareness",
    questionText:
      "You're invited to speak at a global youth summit. To maximize value, you should:",
    options: [
      { label: "A", text: "Speak only about your school" },
      { label: "B", text: "Share your story in relation to global challenges and student-led solutions" },
      { label: "C", text: "Promote your social media" },
      { label: "D", text: "Only thank your teachers" },
    ],
    correctOption: "B",
    explanation:
      "Connection of personal leadership to global context shows depth.",
  },
  {
    section: "Global Awareness",
    questionText:
      "Your team receives feedback that your climate literacy workshop is too advanced for younger students. You:",
    options: [
      { label: "A", text: 'Say "they\'ll catch up"' },
      { label: "B", text: "Simplify content and co-design with junior students" },
      { label: "C", text: "Ignore it" },
      { label: "D", text: "Cancel the workshop" },
    ],
    correctOption: "B",
    explanation:
      "Responsiveness to audience feedback = empathy and adaptation.",
  },
  {
    section: "Global Awareness",
    questionText:
      "In a group project, one student consistently dominates discussions. You:",
    options: [
      { label: "A", text: "Avoid confrontation" },
      { label: "B", text: "Encourage equal speaking opportunities using a rotating lead structure" },
      { label: "C", text: "Ignore others" },
      { label: "D", text: "Let them lead entirely" },
    ],
    correctOption: "B",
    explanation:
      "Inclusive facilitation models collaborative leadership.",
  },
  {
    section: "Global Awareness",
    questionText:
      "You develop an AI chatbot for rural career counseling. To validate impact:",
    options: [
      { label: "A", text: "Track download numbers" },
      { label: "B", text: "Add fancy design" },
      { label: "C", text: "Collect feedback, usage data, and compare pre/post awareness levels" },
      { label: "D", text: "Ask your friends if they like it" },
    ],
    correctOption: "C",
    explanation:
      "Impact must be measurable and evidence-based.",
  },
  {
    section: "Global Awareness",
    questionText:
      "A national essay competition awards you 2nd place. How do you use this for college readiness?",
    options: [
      { label: "A", text: "Mention it once in your CV" },
      { label: "B", text: "Publish it in an online journal and connect it to your future academic interests" },
      { label: "C", text: "Celebrate briefly" },
      { label: "D", text: "Share the trophy image on Instagram" },
    ],
    correctOption: "B",
    explanation:
      "Turning accolades into academic trajectory shows Ivy vision.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Critical Thinking & Ethical Reasoning (20 Questions)
  // ═══════════════════════════════════════════════════════════════════
  {
    section: "Critical Thinking",
    questionText:
      'A student claims: "Since all great leaders read biographies, I will become a great leader by reading them." What\'s wrong with this reasoning?',
    options: [
      { label: "A", text: "Circular logic" },
      { label: "B", text: "False analogy" },
      { label: "C", text: "Fallacy of the converse" },
      { label: "D", text: "Appeal to emotion" },
    ],
    correctOption: "C",
    explanation:
      "This is affirming the consequent — just because all great leaders read biographies doesn't mean reading biographies makes you a great leader.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "Your group project member proposes inflating the results slightly to make the project more impressive. You should:",
    options: [
      { label: "A", text: "Agree to make the team look good" },
      { label: "B", text: "Raise the issue with a teacher immediately" },
      { label: "C", text: "Suggest honesty and discuss how to improve the actual data" },
      { label: "D", text: "Stay silent to avoid conflict" },
    ],
    correctOption: "C",
    explanation:
      "Honest discussion and collaborative improvement are ethically sound and constructive.",
  },
  {
    section: "Critical Thinking",
    questionText:
      'A speaker argues: "Most Nobel winners are scientists, so everyone should become one." Identify the fallacy.',
    options: [
      { label: "A", text: "Ad hominem" },
      { label: "B", text: "False cause" },
      { label: "C", text: "Overgeneralization" },
      { label: "D", text: "Bandwagon" },
    ],
    correctOption: "C",
    explanation:
      "Drawing a universal conclusion from a specific subset is overgeneralization.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "You notice your friend sharing unverified facts online about a health issue. What's your best action?",
    options: [
      { label: "A", text: "Publicly criticize them" },
      { label: "B", text: "Share more dramatic content to balance it" },
      { label: "C", text: "Privately discuss and offer verified sources" },
      { label: "D", text: "Ignore it" },
    ],
    correctOption: "C",
    explanation:
      "Private, constructive correction with evidence is the most mature approach.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "In a school survey, students say art classes reduce stress. To validate the claim scientifically, what must be ensured?",
    options: [
      { label: "A", text: "Students love art" },
      { label: "B", text: "Sample includes only high-performing students" },
      { label: "C", text: "Stress is measured before and after using a standard method" },
      { label: "D", text: "Art is taught by experienced teachers only" },
    ],
    correctOption: "C",
    explanation:
      "Scientific validation requires standardized measurement and pre/post comparison.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A classmate argues that if one coding camp taught them Python, all coding camps must be excellent. This is an example of:",
    options: [
      { label: "A", text: "Red herring" },
      { label: "B", text: "Straw man" },
      { label: "C", text: "Hasty generalization" },
      { label: "D", text: "Valid deductive logic" },
    ],
    correctOption: "C",
    explanation:
      "Generalizing from a single experience to all instances is a hasty generalization.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "You're part of a startup pitch contest. One idea sounds exciting but lacks data. You should:",
    options: [
      { label: "A", text: "Rely on your instinct" },
      { label: "B", text: "Reject it immediately" },
      { label: "C", text: "Ask for feasibility analysis and pilot testing" },
      { label: "D", text: "Support it to avoid conflict" },
    ],
    correctOption: "C",
    explanation:
      "Evidence-based evaluation separates excitement from viability.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A school has funds for either improving sanitation for all or building a new basketball court. Applying utilitarian logic, choose:",
    options: [
      { label: "A", text: "The basketball court for few" },
      { label: "B", text: "Sanitation improvement" },
      { label: "C", text: "Ask the sports team" },
      { label: "D", text: "Use the funds for snacks" },
    ],
    correctOption: "B",
    explanation:
      "Utilitarianism prioritizes the greatest good for the greatest number.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A friend wants to drop out of a group project without informing others. The ethical response is:",
    options: [
      { label: "A", text: "Let them go" },
      { label: "B", text: "Cover for them" },
      { label: "C", text: "Encourage open discussion with the team" },
      { label: "D", text: "Blame them to the teacher" },
    ],
    correctOption: "C",
    explanation:
      "Transparent communication and team responsibility are ethical foundations.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A teacher gives a confusing assignment. Your team produces four different interpretations. What does this suggest?",
    options: [
      { label: "A", text: "The assignment is flawed" },
      { label: "B", text: "Your team is not prepared" },
      { label: "C", text: "The question allows multiple perspectives" },
      { label: "D", text: "Only one team member is right" },
    ],
    correctOption: "C",
    explanation:
      "Ambiguity often invites multiple valid perspectives — recognizing this is critical thinking.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "Two students receive the same grade. One studied hard, the other cheated. What should the system do to be fair?",
    options: [
      { label: "A", text: "Nothing—same result" },
      { label: "B", text: "Privately praise the honest student" },
      { label: "C", text: "Investigate cheating and apply fair consequences" },
      { label: "D", text: "Lower both students' grades" },
    ],
    correctOption: "C",
    explanation:
      "Fairness requires accountability and integrity in the evaluation process.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A leadership camp selects only students who have held formal positions. What's a potential flaw in this?",
    options: [
      { label: "A", text: "It ignores informal leaders who show initiative without titles" },
      { label: "B", text: "It's fair because only leaders should go" },
      { label: "C", text: "It rewards students by popularity" },
      { label: "D", text: "It helps introverts" },
    ],
    correctOption: "A",
    explanation:
      "Leadership extends beyond formal titles — excluding informal leaders creates selection bias.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A science club only promotes winners in its newsletter. This may create:",
    options: [
      { label: "A", text: "Fair recognition" },
      { label: "B", text: "Healthy motivation" },
      { label: "C", text: "A biased culture that ignores effort" },
      { label: "D", text: "Faster success" },
    ],
    correctOption: "C",
    explanation:
      "Recognizing only outcomes can devalue effort and discourage participation.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "You propose a student project, but others disagree. The mature next step is to:",
    options: [
      { label: "A", text: "Push your idea" },
      { label: "B", text: "Leave the group" },
      { label: "C", text: "Facilitate a team vote and integrate ideas" },
      { label: "D", text: "Convince the teacher privately" },
    ],
    correctOption: "C",
    explanation:
      "Democratic facilitation and idea integration reflect collaborative maturity.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "A school decides to install only surveillance cameras instead of promoting trust among students. This shows:",
    options: [
      { label: "A", text: "A security-first approach" },
      { label: "B", text: "Lack of ethical development efforts" },
      { label: "C", text: "A desire for transparency" },
      { label: "D", text: "Innovation" },
    ],
    correctOption: "B",
    explanation:
      "Over-reliance on surveillance without trust-building neglects ethical development.",
  },
  {
    section: "Critical Thinking",
    questionText:
      'A student argues: "Climate change is a myth because it snowed this winter." What\'s wrong?',
    options: [
      { label: "A", text: "Appeal to tradition" },
      { label: "B", text: "False equivalence" },
      { label: "C", text: "Confusing short-term weather with long-term climate" },
      { label: "D", text: "Argument from ignorance" },
    ],
    correctOption: "C",
    explanation:
      "Weather events are short-term; climate is a long-term trend. Confusing them is a logical error.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "Your environmental group can only fund one project. You must choose between a tree plantation and a wetland cleanup. The most rational choice process:",
    options: [
      { label: "A", text: "Choose what others prefer" },
      { label: "B", text: "Flip a coin" },
      { label: "C", text: "Analyze long-term environmental impact, cost, and community needs" },
      { label: "D", text: "Pick the easiest" },
    ],
    correctOption: "C",
    explanation:
      "Rational decision-making involves multi-criteria analysis.",
  },
  {
    section: "Critical Thinking",
    questionText:
      'A peer proposes a "mental fitness badge" only for students who meditate. A fairer approach would be:',
    options: [
      { label: "A", text: "Award it based on diverse methods of stress management" },
      { label: "B", text: "Give it only to top scorers" },
      { label: "C", text: "Remove it" },
      { label: "D", text: "Give everyone a badge" },
    ],
    correctOption: "A",
    explanation:
      "Inclusivity in recognition respects diverse approaches to well-being.",
  },
  {
    section: "Critical Thinking",
    questionText:
      'In a debate, someone says: "You\'re just a kid, so your view doesn\'t count." What\'s the fallacy?',
    options: [
      { label: "A", text: "False cause" },
      { label: "B", text: "Ad hominem" },
      { label: "C", text: "Bandwagon" },
      { label: "D", text: "Red herring" },
    ],
    correctOption: "B",
    explanation:
      "Attacking the person rather than their argument is an ad hominem fallacy.",
  },
  {
    section: "Critical Thinking",
    questionText:
      "You lead a team where two members always disagree. To make ethical, inclusive decisions, you should:",
    options: [
      { label: "A", text: "Remove one" },
      { label: "B", text: "Decide alone" },
      { label: "C", text: "Create structured space for each viewpoint and mediate toward consensus" },
      { label: "D", text: "Ignore them both" },
    ],
    correctOption: "C",
    explanation:
      "Structured mediation ensures all voices are heard and decisions are inclusive.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Academic Aptitude & Research Readiness (20 Questions)
  // ═══════════════════════════════════════════════════════════════════
  {
    section: "Academic Aptitude",
    questionText:
      "A student cites a blog post summarizing a research paper. What is the academically honest next step?",
    options: [
      { label: "A", text: "Cite only the blog" },
      { label: "B", text: "Read and cite the original paper" },
      { label: "C", text: "Rewrite the blog post in own words" },
      { label: "D", text: "Omit the citation" },
    ],
    correctOption: "B",
    explanation:
      "Academic integrity requires tracing and citing original sources.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "Your lab team finds results opposite to your hypothesis. What should you do in your report?",
    options: [
      { label: "A", text: "Change the hypothesis" },
      { label: "B", text: "Hide the results" },
      { label: "C", text: "Report the findings and explain possible reasons" },
      { label: "D", text: "Adjust data to match your hypothesis" },
    ],
    correctOption: "C",
    explanation:
      "Scientific integrity demands reporting actual findings and analyzing discrepancies.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "Which is not a reliable academic source?",
    options: [
      { label: "A", text: "Peer-reviewed journal article" },
      { label: "B", text: "Government statistics" },
      { label: "C", text: "Social media influencer's opinion" },
      { label: "D", text: "University research paper" },
    ],
    correctOption: "C",
    explanation:
      "Social media opinions lack peer review and academic rigor.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A valid hypothesis must be:",
    options: [
      { label: "A", text: "Based on feelings" },
      { label: "B", text: "Unprovable" },
      { label: "C", text: "Measurable and testable" },
      { label: "D", text: "Only theoretical" },
    ],
    correctOption: "C",
    explanation:
      "A hypothesis must be empirically testable and measurable to have scientific value.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "If a survey shows that 90% of students improved after using a learning app, what must be checked before accepting the result?",
    options: [
      { label: "A", text: "Whether the app looks good" },
      { label: "B", text: "Sample size and how improvement was measured" },
      { label: "C", text: "Number of downloads" },
      { label: "D", text: "Cost of the app" },
    ],
    correctOption: "B",
    explanation:
      "Statistical validity depends on sample size and measurement methodology.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "What's an ethical responsibility when conducting research with human participants?",
    options: [
      { label: "A", text: "Keep results secret" },
      { label: "B", text: "Obtain informed consent" },
      { label: "C", text: "Only use friends" },
      { label: "D", text: "Hide the purpose" },
    ],
    correctOption: "B",
    explanation:
      "Informed consent is a fundamental ethical requirement in human research.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A group deletes some data points to improve their results. This is an example of:",
    options: [
      { label: "A", text: "Good editing" },
      { label: "B", text: "Ethical cleaning" },
      { label: "C", text: "Data manipulation" },
      { label: "D", text: "Peer review" },
    ],
    correctOption: "C",
    explanation:
      "Selectively removing data to alter results is data manipulation — a serious ethical violation.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "Which part of a research paper summarizes key ideas, methods, and conclusions?",
    options: [
      { label: "A", text: "Introduction" },
      { label: "B", text: "Hypothesis" },
      { label: "C", text: "Abstract" },
      { label: "D", text: "Bibliography" },
    ],
    correctOption: "C",
    explanation:
      "The abstract provides a concise summary of the entire research paper.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A good research question should be:",
    options: [
      { label: "A", text: "Vague and broad" },
      { label: "B", text: "Personal and emotional" },
      { label: "C", text: "Focused and researchable" },
      { label: "D", text: "Already answered" },
    ],
    correctOption: "C",
    explanation:
      "Focused, researchable questions yield meaningful and manageable investigations.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A student wants to check if background music affects concentration. The dependent variable is:",
    options: [
      { label: "A", text: "Type of music" },
      { label: "B", text: "Music volume" },
      { label: "C", text: "Student concentration level" },
      { label: "D", text: "Room lighting" },
    ],
    correctOption: "C",
    explanation:
      "The dependent variable is what is being measured — concentration level.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "What's the best way to avoid confirmation bias in research?",
    options: [
      { label: "A", text: "Only look for info that supports your view" },
      { label: "B", text: "Use diverse sources and design neutral questions" },
      { label: "C", text: "Interview only like-minded peers" },
      { label: "D", text: "Avoid feedback" },
    ],
    correctOption: "B",
    explanation:
      "Diverse sources and neutral question design counteract confirmation bias.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "Two students do the same project but don't credit each other. This is a violation of:",
    options: [
      { label: "A", text: "Teamwork" },
      { label: "B", text: "Plagiarism policies" },
      { label: "C", text: "Research format" },
      { label: "D", text: "Grading rules" },
    ],
    correctOption: "B",
    explanation:
      "Failing to credit collaborators violates academic honesty and plagiarism policies.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "When using a source you only skimmed, you should:",
    options: [
      { label: "A", text: "Cite it anyway" },
      { label: "B", text: "Avoid citing it" },
      { label: "C", text: "Fully read and evaluate before citing" },
      { label: "D", text: "Cite the summary only" },
    ],
    correctOption: "C",
    explanation:
      "Responsible citation requires thorough understanding of the source material.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "What does peer review ensure in academic publishing?",
    options: [
      { label: "A", text: "Speed" },
      { label: "B", text: "Ethical research and quality control" },
      { label: "C", text: "Profit for journals" },
      { label: "D", text: "Public popularity" },
    ],
    correctOption: "B",
    explanation:
      "Peer review ensures quality control, methodological rigor, and ethical standards.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "You get two conflicting studies on the same topic. The best response is to:",
    options: [
      { label: "A", text: "Pick the one you like" },
      { label: "B", text: "Ignore both" },
      { label: "C", text: "Compare their methods, samples, and biases" },
      { label: "D", text: "Choose the newest one" },
    ],
    correctOption: "C",
    explanation:
      "Critical comparison of methodology and potential biases leads to informed evaluation.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A strong research introduction should include:",
    options: [
      { label: "A", text: "Personal goals" },
      { label: "B", text: "Topic background and purpose" },
      { label: "C", text: "Survey graphs" },
      { label: "D", text: "Final results" },
    ],
    correctOption: "B",
    explanation:
      "A strong introduction establishes context, background, and the purpose of the research.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "Which is the most unethical citation practice?",
    options: [
      { label: "A", text: "Citing someone's idea in your own words" },
      { label: "B", text: "Quoting with full reference" },
      { label: "C", text: "Using a source you never read" },
      { label: "D", text: "Citing multiple sources" },
    ],
    correctOption: "C",
    explanation:
      "Citing unread sources misrepresents your knowledge and is academically dishonest.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      'Your research topic is "effects of school gardening on student well-being." Which is a strong hypothesis?',
    options: [
      { label: "A", text: "Gardening is fun" },
      { label: "B", text: "If students participate in gardening, they will show improved well-being" },
      { label: "C", text: "Schools should have gardens" },
      { label: "D", text: "Children love flowers" },
    ],
    correctOption: "B",
    explanation:
      "A strong hypothesis is specific, testable, and states a clear expected outcome.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "You include personal stories in your report. To make the report academically stronger, add:",
    options: [
      { label: "A", text: "Jokes" },
      { label: "B", text: "Movie quotes" },
      { label: "C", text: "Verified data or studies" },
      { label: "D", text: "More opinions" },
    ],
    correctOption: "C",
    explanation:
      "Academic strength comes from supporting anecdotes with verified data and research.",
  },
  {
    section: "Academic Aptitude",
    questionText:
      "A student gets a surprising result. Instead of ignoring it, the best action is to:",
    options: [
      { label: "A", text: "Hide it" },
      { label: "B", text: "Retest and document conditions" },
      { label: "C", text: "Ask a friend what to do" },
      { label: "D", text: "Change the method secretly" },
    ],
    correctOption: "B",
    explanation:
      "Surprising results warrant retesting and careful documentation — not concealment.",
  },
];

// ── Seed runner ──────────────────────────────────────────────────────
const seedIvyTestQuestions = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing ivy test questions
    const deleted = await IvyTestQuestion.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing test questions`);

    // Add default marks = 2 to every question
    const withDefaults = questions.map((q) => ({
      ...q,
      marks: 2,
      isActive: true,
    }));

    const inserted = await IvyTestQuestion.insertMany(withDefaults);
    console.log(`✅ Seeded ${inserted.length} test questions`);

    // Print summary by section
    const sections = ["Global Awareness", "Critical Thinking", "Academic Aptitude", "Quantitative Logic"];
    for (const sec of sections) {
      const count = inserted.filter((q) => q.section === sec).length;
      if (count > 0) console.log(`   📌 ${sec}: ${count} questions`);
    }

    console.log(`\n📊 Total: ${inserted.length} questions · ${inserted.length * 2} marks`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
};

seedIvyTestQuestions();
