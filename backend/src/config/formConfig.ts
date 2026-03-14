/**
 * Hardcoded form structure configuration.
 * Replaces the dynamic FormField/FormSection/FormSubSection/FormPart/ServiceFormPart collections.
 * 
 * Answer storage format: { [sectionKey]: { [subSectionKey]: [{ fieldKey: value, ... }] } }
 */

// ─── Field Types ───
export enum FieldType {
  TEXT = "TEXT",
  EMAIL = "EMAIL",
  NUMBER = "NUMBER",
  DATE = "DATE",
  PHONE = "PHONE",
  TEXTAREA = "TEXTAREA",
  SELECT = "SELECT",
  RADIO = "RADIO",
  CHECKBOX = "CHECKBOX",
  FILE = "FILE",
  COUNTRY = "COUNTRY",
  STATE = "STATE",
  CITY = "CITY",
}

// ─── Part Keys ───
export enum FormPartKey {
  PROFILE = "PROFILE",
  APPLICATION = "APPLICATION",
  DOCUMENT = "DOCUMENT",
  PAYMENT = "PAYMENT",
}

// ─── Types ───
export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  order: number;
  validation?: FieldValidation;
  options?: FieldOption[];
  defaultValue?: any;
}

export interface SubSectionConfig {
  key: string;
  title: string;
  description?: string;
  order: number;
  isRepeatable: boolean;
  maxRepeat?: number;
  fields: FormFieldConfig[];
}

export interface SectionConfig {
  key: string;
  title: string;
  description?: string;
  order: number;
  subSections: SubSectionConfig[];
}

export interface PartConfig {
  key: FormPartKey;
  title: string;
  description?: string;
  order: number;
  sections: SectionConfig[];
}

// ═══════════════════════════════════════════════════════
// PROFILE PART — Complete field definitions
// ═══════════════════════════════════════════════════════

const GENDER_OPTIONS: FieldOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const MARITAL_STATUS_OPTIONS: FieldOption[] = [
  { label: "Single", value: "single" },
  { label: "Married", value: "married" },
  { label: "Divorced", value: "divorced" },
  { label: "Widowed", value: "widowed" },
];

const PARENT_RELATIONSHIP_OPTIONS: FieldOption[] = [
  { label: "Father", value: "father" },
  { label: "Mother", value: "mother" },
  { label: "Guardian", value: "guardian" },
  { label: "Sibling", value: "sibling" },
  { label: "Spouse", value: "spouse" },
  { label: "Other", value: "other" },
];

const EDUCATION_LEVEL_OPTIONS: FieldOption[] = [
  { label: "High School", value: "high_school" },
  { label: "Associate Degree", value: "associate" },
  { label: "Bachelor's Degree", value: "bachelors" },
  { label: "Master's Degree", value: "masters" },
  { label: "Doctorate", value: "doctorate" },
];

const MARKS_SYSTEM_OPTIONS: FieldOption[] = [
  { label: "GPA out of 4", value: "4" },
  { label: "GPA out of 5", value: "5" },
  { label: "GPA out of 10", value: "10" },
  { label: "Percentage out of 100", value: "100" },
];

const YES_NO_OPTIONS: FieldOption[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const SOURCE_OF_FUND_OPTIONS: FieldOption[] = [
  { label: "Education Loan", value: "loan" },
  { label: "Self Funding", value: "self_funding" },
];

const CURRENCY_OPTIONS: FieldOption[] = [
  { label: "USD - US Dollar", value: "USD" },
  { label: "EUR - Euro", value: "EUR" },
  { label: "GBP - British Pound", value: "GBP" },
  { label: "INR - Indian Rupee", value: "INR" },
  { label: "AUD - Australian Dollar", value: "AUD" },
  { label: "CAD - Canadian Dollar", value: "CAD" },
  { label: "SGD - Singapore Dollar", value: "SGD" },
  { label: "CHF - Swiss Franc", value: "CHF" },
  { label: "MYR - Malaysian Ringgit", value: "MYR" },
  { label: "JPY - Japanese Yen", value: "JPY" },
  { label: "CNY - Chinese Yuan", value: "CNY" },
  { label: "NZD - New Zealand Dollar", value: "NZD" },
  { label: "THB - Thai Baht", value: "THB" },
  { label: "HKD - Hong Kong Dollar", value: "HKD" },
  { label: "NOK - Norwegian Krone", value: "NOK" },
  { label: "SEK - Swedish Krona", value: "SEK" },
  { label: "DKK - Danish Krone", value: "DKK" },
  { label: "ZAR - South African Rand", value: "ZAR" },
  { label: "KRW - South Korean Won", value: "KRW" },
  { label: "BRL - Brazilian Real", value: "BRL" },
  { label: "AED - UAE Dirham", value: "AED" },
  { label: "SAR - Saudi Riyal", value: "SAR" },
  { label: "QAR - Qatari Riyal", value: "QAR" },
  { label: "KWD - Kuwaiti Dinar", value: "KWD" },
  { label: "BHD - Bahraini Dinar", value: "BHD" },
  { label: "OMR - Omani Rial", value: "OMR" },
  { label: "TWD - Taiwan Dollar", value: "TWD" },
  { label: "PHP - Philippine Peso", value: "PHP" },
  { label: "IDR - Indonesian Rupiah", value: "IDR" },
  { label: "MXN - Mexican Peso", value: "MXN" },
  { label: "RUB - Russian Ruble", value: "RUB" },
  { label: "TRY - Turkish Lira", value: "TRY" },
  { label: "PLN - Polish Zloty", value: "PLN" },
  { label: "CZK - Czech Koruna", value: "CZK" },
  { label: "HUF - Hungarian Forint", value: "HUF" },
  { label: "ILS - Israeli Shekel", value: "ILS" },
  { label: "CLP - Chilean Peso", value: "CLP" },
  { label: "PKR - Pakistani Rupee", value: "PKR" },
  { label: "BDT - Bangladeshi Taka", value: "BDT" },
  { label: "LKR - Sri Lankan Rupee", value: "LKR" },
];

// ─── PROFILE Part Config ───

export const PROFILE_CONFIG: PartConfig = {
  key: FormPartKey.PROFILE,
  title: "Profile",
  description: "Your personal information",
  order: 1,
  sections: [
    {
      key: "personalDetails",
      title: "Personal Details",
      order: 1,
      subSections: [
        {
          key: "personalInformation",
          title: "Personal Information",
          order: 1,
          isRepeatable: false,
          fields: [
            { key: "firstName", label: "First Name", type: FieldType.TEXT, placeholder: "Enter first name", required: true, order: 1 },
            { key: "middleName", label: "Middle Name", type: FieldType.TEXT, placeholder: "Enter middle name", required: false, order: 2 },
            { key: "lastName", label: "Last Name", type: FieldType.TEXT, placeholder: "Enter last name", required: true, order: 3 },
            { key: "dob", label: "Date of Birth", type: FieldType.DATE, required: true, order: 4 },
            { key: "birthcity", label: "Birth City", type: FieldType.TEXT, placeholder: "Enter birth city", required: false, order: 5 },
            { key: "gender", label: "Gender", type: FieldType.SELECT, required: true, order: 6, options: GENDER_OPTIONS },
            { key: "maritalStatus", label: "Marital Status", type: FieldType.SELECT, required: false, order: 7, options: MARITAL_STATUS_OPTIONS },
          ],
        },
        {
          key: "mailingAddress",
          title: "Mailing Address",
          order: 2,
          isRepeatable: false,
          fields: [
            { key: "mailingAddress1", label: "Address Line 1", type: FieldType.TEXT, placeholder: "Street address", required: true, order: 1 },
            { key: "mailingAddress2", label: "Address Line 2", type: FieldType.TEXT, placeholder: "Apt, suite, etc.", required: false, order: 2 },
            { key: "mailingCountry", label: "Country", type: FieldType.SELECT, required: true, order: 3, defaultValue: "IN" },
            { key: "mailingState", label: "State", type: FieldType.SELECT, required: true, order: 4 },
            { key: "mailingCity", label: "City", type: FieldType.TEXT, placeholder: "Enter city", required: true, order: 5 },
            { key: "mailingPostalCode", label: "Postal Code", type: FieldType.TEXT, placeholder: "Enter postal code", required: true, order: 6 },
          ],
        },
        {
          key: "permanentAddress",
          title: "Permanent Address",
          order: 3,
          isRepeatable: false,
          fields: [
            { key: "sameAsMailingAddress", label: "Same as Mailing Address", type: FieldType.CHECKBOX, required: false, order: 1 },
            { key: "permanentAddress1", label: "Address Line 1", type: FieldType.TEXT, placeholder: "Street address", required: true, order: 2 },
            { key: "permanentAddress2", label: "Address Line 2", type: FieldType.TEXT, placeholder: "Apt, suite, etc.", required: false, order: 3 },
            { key: "permanentCountry", label: "Country", type: FieldType.SELECT, required: true, order: 4, defaultValue: "IN" },
            { key: "permanentState", label: "State", type: FieldType.SELECT, required: true, order: 5 },
            { key: "permanentCity", label: "City", type: FieldType.TEXT, placeholder: "Enter city", required: true, order: 6 },
            { key: "permanentPostalCode", label: "Postal Code", type: FieldType.TEXT, placeholder: "Enter postal code", required: true, order: 7 },
          ],
        },
        {
          key: "passportInformation",
          title: "Passport Information",
          order: 4,
          isRepeatable: false,
          fields: [
            { key: "passportNumber", label: "Passport Number", type: FieldType.TEXT, placeholder: "Enter passport number", required: false, order: 1 },
            { key: "passportPlaceOfIssue", label: "Place of Issue", type: FieldType.TEXT, placeholder: "Enter place of issue", required: false, order: 2 },
            { key: "passportIssueDate", label: "Issue Date", type: FieldType.DATE, required: false, order: 3 },
            { key: "passportExpiryDate", label: "Expiry Date", type: FieldType.DATE, required: false, order: 4 },
          ],
        },
        {
          key: "nationality",
          title: "Nationality",
          order: 5,
          isRepeatable: false,
          fields: [
            { key: "citizenship", label: "Citizenship", type: FieldType.COUNTRY, required: false, order: 1 },
            { key: "countryOfBirth", label: "Country of Birth", type: FieldType.COUNTRY, required: false, order: 2 },
          ],
        },
        {
          key: "backgroundInformation",
          title: "Background Information",
          order: 6,
          isRepeatable: false,
          fields: [
            { key: "backgroundInfo", label: "Background Information", type: FieldType.TEXTAREA, placeholder: "Enter any relevant background information", required: false, order: 1 },
          ],
        },
        {
          key: "additionalInformation",
          title: "Additional Information",
          order: 7,
          isRepeatable: false,
          fields: [
            { key: "additionalInfo", label: "Additional Information", type: FieldType.TEXTAREA, placeholder: "Any additional information you'd like to share", required: false, order: 1 },
          ],
        },
      ],
    },
    {
      key: "parentalDetails",
      title: "Parental Details",
      order: 2,
      subSections: [
        {
          key: "parentGuardian",
          title: "Parent / Guardian Details",
          order: 1,
          isRepeatable: true,
          maxRepeat: 2,
          fields: [
            { key: "parentFirstName", label: "First Name", type: FieldType.TEXT, placeholder: "Enter first name", required: true, order: 1 },
            { key: "parentMiddleName", label: "Middle Name", type: FieldType.TEXT, placeholder: "Enter middle name", required: false, order: 2 },
            { key: "parentLastName", label: "Last Name", type: FieldType.TEXT, placeholder: "Enter last name", required: true, order: 3 },
            { key: "parentRelationship", label: "Relationship", type: FieldType.SELECT, required: true, order: 4, options: PARENT_RELATIONSHIP_OPTIONS },
            { key: "parentMobile", label: "Mobile Number", type: FieldType.PHONE, placeholder: "Enter mobile number", required: true, order: 5 },
            { key: "parentEmail", label: "Email", type: FieldType.EMAIL, placeholder: "Enter email address", required: true, order: 6 },
            { key: "parentQualification", label: "Qualification", type: FieldType.TEXT, placeholder: "Enter qualification", required: false, order: 7 },
            { key: "parentOccupation", label: "Occupation", type: FieldType.TEXT, placeholder: "Enter occupation", required: false, order: 8 },
          ],
        },
      ],
    },
    {
      key: "academicQualification",
      title: "Academic Qualification",
      order: 3,
      subSections: [
        {
          key: "educationSummary",
          title: "Education Summary",
          order: 1,
          isRepeatable: true,
          maxRepeat: 10,
          fields: [
            { key: "educationLevel", label: "Education Level", type: FieldType.SELECT, required: true, order: 1, options: EDUCATION_LEVEL_OPTIONS },
            { key: "institutionName", label: "Institution Name", type: FieldType.TEXT, placeholder: "Enter institution name", required: true, order: 2 },
            { key: "institutionCountry", label: "Country of Institution", type: FieldType.COUNTRY, required: true, order: 3 },
            { key: "fieldOfStudy", label: "Field of Study", type: FieldType.TEXT, placeholder: "Enter field of study", required: true, order: 4 },
            { key: "startDate", label: "Start Date", type: FieldType.DATE, required: true, order: 5 },
            { key: "endDate", label: "End Date", type: FieldType.DATE, required: false, order: 6 },
            { key: "totalMarks", label: "Grading System", type: FieldType.SELECT, required: true, order: 7, options: MARKS_SYSTEM_OPTIONS },
            { key: "gpa", label: "GPA / Percentage", type: FieldType.TEXT, placeholder: "Enter your GPA or percentage", required: true, order: 8 },
            { key: "currentlyStudying", label: "Currently Studying Here", type: FieldType.CHECKBOX, required: false, order: 9 },
          ],
        },
      ],
    },
    {
      key: "workExperience",
      title: "Work Experience",
      order: 4,
      subSections: [
        {
          key: "workExperienceInternship",
          title: "Work Experience/Internship",
          order: 1,
          isRepeatable: true,
          maxRepeat: 10,
          fields: [
            { key: "companyName", label: "Company Name", type: FieldType.TEXT, placeholder: "Enter company name", required: true, order: 1 },
            { key: "jobTitle", label: "Job Title", type: FieldType.TEXT, placeholder: "Enter job title", required: true, order: 2 },
            { key: "workCountry", label: "Country", type: FieldType.COUNTRY, required: true, order: 3 },
            { key: "currentlyWorking", label: "Currently Working Here", type: FieldType.CHECKBOX, required: false, order: 4 },
            { key: "workStartDate", label: "Start Date", type: FieldType.DATE, required: true, order: 5 },
            { key: "workEndDate", label: "End Date", type: FieldType.DATE, required: false, order: 6 },
            { key: "reportingManager", label: "Reporting Manager", type: FieldType.TEXT, placeholder: "Enter reporting manager name", required: false, order: 7 },
            { key: "reportingToEmail", label: "Reporting Manager Email", type: FieldType.EMAIL, placeholder: "Enter reporting manager email", required: false, order: 8 },
            { key: "jobDescription", label: "Job Description", type: FieldType.TEXTAREA, placeholder: "Describe your role and responsibilities", required: false, order: 9 },
          ],
        },
      ],
    },
    {
      key: "tests",
      title: "Tests",
      order: 5,
      subSections: [
        {
          key: "ielts",
          title: "IELTS",
          order: 1,
          isRepeatable: false,
          fields: [
            { key: "hasTakenIELTS", label: "Have you taken IELTS?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "ieltsTRFNumber", label: "TRF Number", type: FieldType.TEXT, placeholder: "Enter TRF number", required: false, order: 2 },
            { key: "ieltsOverall", label: "Overall Band Score", type: FieldType.NUMBER, placeholder: "0-9", required: false, order: 3, validation: { min: 0, max: 9 } },
            { key: "ieltsListening", label: "Listening", type: FieldType.NUMBER, placeholder: "0-9", required: false, order: 4, validation: { min: 0, max: 9 } },
            { key: "ieltsReading", label: "Reading", type: FieldType.NUMBER, placeholder: "0-9", required: false, order: 5, validation: { min: 0, max: 9 } },
            { key: "ieltsWriting", label: "Writing", type: FieldType.NUMBER, placeholder: "0-9", required: false, order: 6, validation: { min: 0, max: 9 } },
            { key: "ieltsSpeaking", label: "Speaking", type: FieldType.NUMBER, placeholder: "0-9", required: false, order: 7, validation: { min: 0, max: 9 } },
            { key: "ieltsTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 8 },
          ],
        },
        {
          key: "gre",
          title: "GRE",
          order: 2,
          isRepeatable: false,
          fields: [
            { key: "hasTakenGRE", label: "Have you taken GRE?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "greTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "greVerbal", label: "Verbal Reasoning", type: FieldType.NUMBER, placeholder: "130-170", required: false, order: 3, validation: { min: 130, max: 170 } },
            { key: "greQuantitative", label: "Quantitative Reasoning", type: FieldType.NUMBER, placeholder: "130-170", required: false, order: 4, validation: { min: 130, max: 170 } },
            { key: "greWriting", label: "Analytical Writing", type: FieldType.NUMBER, placeholder: "0-6", required: false, order: 5, validation: { min: 0, max: 6 } },
            { key: "greRegistrationNumber", label: "Registration Number", type: FieldType.TEXT, placeholder: "Enter registration number", required: false, order: 6 },
          ],
        },
        {
          key: "sat",
          title: "SAT",
          order: 3,
          isRepeatable: false,
          fields: [
            { key: "hasTakenSAT", label: "Have you taken SAT?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "satTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "satTotal", label: "Total Score", type: FieldType.NUMBER, placeholder: "400-1600", required: false, order: 3, validation: { min: 400, max: 1600 } },
            { key: "satReadingWriting", label: "Reading & Writing", type: FieldType.NUMBER, placeholder: "200-800", required: false, order: 4, validation: { min: 200, max: 800 } },
            { key: "satMath", label: "Math", type: FieldType.NUMBER, placeholder: "200-800", required: false, order: 5, validation: { min: 200, max: 800 } },
            { key: "satRegistrationNumber", label: "Registration Number", type: FieldType.TEXT, placeholder: "Enter registration number", required: false, order: 6 },
          ],
        },
        {
          key: "pte",
          title: "PTE",
          order: 4,
          isRepeatable: false,
          fields: [
            { key: "hasTakenPTE", label: "Have you taken PTE?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "pteTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "pteOverall", label: "Overall Score", type: FieldType.NUMBER, placeholder: "10-90", required: false, order: 3, validation: { min: 10, max: 90 } },
            { key: "pteListening", label: "Listening", type: FieldType.NUMBER, placeholder: "10-90", required: false, order: 4, validation: { min: 10, max: 90 } },
            { key: "pteReading", label: "Reading", type: FieldType.NUMBER, placeholder: "10-90", required: false, order: 5, validation: { min: 10, max: 90 } },
            { key: "pteWriting", label: "Writing", type: FieldType.NUMBER, placeholder: "10-90", required: false, order: 6, validation: { min: 10, max: 90 } },
            { key: "pteSpeaking", label: "Speaking", type: FieldType.NUMBER, placeholder: "10-90", required: false, order: 7, validation: { min: 10, max: 90 } },
            { key: "pteScoreReportCode", label: "Score Report Code", type: FieldType.TEXT, placeholder: "Enter score report code", required: false, order: 8 },
          ],
        },
        {
          key: "toefl",
          title: "TOEFL",
          order: 5,
          isRepeatable: false,
          fields: [
            { key: "hasTakenTOEFL", label: "Have you taken TOEFL?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "toeflTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "toeflTotal", label: "Total Score", type: FieldType.NUMBER, placeholder: "0-120", required: false, order: 3, validation: { min: 0, max: 120 } },
            { key: "toeflReading", label: "Reading", type: FieldType.NUMBER, placeholder: "0-30", required: false, order: 4, validation: { min: 0, max: 30 } },
            { key: "toeflListening", label: "Listening", type: FieldType.NUMBER, placeholder: "0-30", required: false, order: 5, validation: { min: 0, max: 30 } },
            { key: "toeflSpeaking", label: "Speaking", type: FieldType.NUMBER, placeholder: "0-30", required: false, order: 6, validation: { min: 0, max: 30 } },
            { key: "toeflWriting", label: "Writing", type: FieldType.NUMBER, placeholder: "0-30", required: false, order: 7, validation: { min: 0, max: 30 } },
            { key: "toeflRegistrationNumber", label: "Registration Number", type: FieldType.TEXT, placeholder: "Enter registration number", required: false, order: 8 },
          ],
        },
        {
          key: "gmat",
          title: "GMAT",
          order: 6,
          isRepeatable: false,
          fields: [
            { key: "hasTakenGMAT", label: "Have you taken GMAT?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "gmatTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "gmatTotal", label: "Total Score", type: FieldType.NUMBER, placeholder: "200-800", required: false, order: 3, validation: { min: 200, max: 800 } },
            { key: "gmatVerbal", label: "Verbal", type: FieldType.NUMBER, placeholder: "0-60", required: false, order: 4, validation: { min: 0, max: 60 } },
            { key: "gmatQuantitative", label: "Quantitative", type: FieldType.NUMBER, placeholder: "0-60", required: false, order: 5, validation: { min: 0, max: 60 } },
            { key: "gmatAWA", label: "Analytical Writing Assessment", type: FieldType.NUMBER, placeholder: "0-6", required: false, order: 6, validation: { min: 0, max: 6 } },
            { key: "gmatIR", label: "Integrated Reasoning", type: FieldType.NUMBER, placeholder: "1-8", required: false, order: 7, validation: { min: 1, max: 8 } },
            { key: "gmatAppointmentNumber", label: "Appointment Number", type: FieldType.TEXT, placeholder: "Enter appointment number", required: false, order: 8 },
          ],
        },
        {
          key: "duolingo",
          title: "Duolingo",
          order: 7,
          isRepeatable: false,
          fields: [
            { key: "hasTakenDuolingo", label: "Have you taken Duolingo English Test?", type: FieldType.RADIO, required: false, order: 1, options: YES_NO_OPTIONS },
            { key: "duolingoTestDate", label: "Test Date", type: FieldType.DATE, required: false, order: 2 },
            { key: "duolingoOverall", label: "Overall Score", type: FieldType.NUMBER, placeholder: "10-160", required: false, order: 3, validation: { min: 10, max: 160 } },
            { key: "duolingoLiteracy", label: "Literacy", type: FieldType.NUMBER, placeholder: "10-160", required: false, order: 4, validation: { min: 10, max: 160 } },
            { key: "duolingoConversation", label: "Conversation", type: FieldType.NUMBER, placeholder: "10-160", required: false, order: 5, validation: { min: 10, max: 160 } },
            { key: "duolingoComprehension", label: "Comprehension", type: FieldType.NUMBER, placeholder: "10-160", required: false, order: 6, validation: { min: 10, max: 160 } },
            { key: "duolingoProduction", label: "Production", type: FieldType.NUMBER, placeholder: "10-160", required: false, order: 7, validation: { min: 10, max: 160 } },
            { key: "duolingoTestID", label: "Test ID", type: FieldType.TEXT, placeholder: "Enter test ID", required: false, order: 8 },
          ],
        },
      ],
    },
    {
      key: "finance",
      title: "Finance",
      order: 6,
      subSections: [
        {
          key: "sponsors",
          title: "Sponsorers",
          order: 1,
          isRepeatable: true,
          maxRepeat: 10,
          fields: [
            { key: "sponsorerName", label: "Sponsor Name", type: FieldType.TEXT, placeholder: "Enter sponsor name", required: true, order: 1 },
            { key: "sponsorerAddress", label: "Sponsor Address", type: FieldType.TEXTAREA, placeholder: "Enter sponsor address", required: false, order: 2 },
            { key: "sponsorerMobile", label: "Mobile Number", type: FieldType.PHONE, placeholder: "Enter mobile number", required: false, order: 3 },
            { key: "sponsorerEmail", label: "Email", type: FieldType.EMAIL, placeholder: "Enter email address", required: false, order: 4 },
            { key: "sponsorerRelationship", label: "Relationship", type: FieldType.TEXT, placeholder: "Enter relationship", required: false, order: 5 },
            { key: "sourceOfFund", label: "Source of Fund", type: FieldType.SELECT, required: false, order: 6, options: SOURCE_OF_FUND_OPTIONS },
            { key: "currencyType", label: "Currency", type: FieldType.SELECT, required: false, order: 7, options: CURRENCY_OPTIONS },
            { key: "sponsorAmount", label: "Amount", type: FieldType.NUMBER, placeholder: "Enter amount", required: false, order: 8 },
          ],
        },
      ],
    },
    {
      key: "visa",
      title: "Visa",
      order: 7,
      subSections: [
        {
          key: "visaReferred",
          title: "Visa Referred Details",
          order: 1,
          isRepeatable: false,
          fields: [
            { key: "visaReferredName", label: "Referred By (Name)", type: FieldType.TEXT, placeholder: "Enter name", required: false, order: 1 },
            { key: "visaReferredEmail", label: "Email", type: FieldType.EMAIL, placeholder: "Enter email", required: false, order: 2 },
            { key: "visaReferredMobile", label: "Mobile Number", type: FieldType.PHONE, placeholder: "Enter mobile number", required: false, order: 3 },
            { key: "visaReferredLocation", label: "Location", type: FieldType.TEXT, placeholder: "Enter location", required: false, order: 4 },
          ],
        },
      ],
    },
  ],
};

// ─── APPLICATION Part Config ───
export const APPLICATION_CONFIG: PartConfig = {
  key: FormPartKey.APPLICATION,
  title: "Application",
  description: "Program applications",
  order: 2,
  sections: [
    { key: "applyToProgram", title: "Apply to Program", order: 1, subSections: [] },
    { key: "appliedProgram", title: "Applied Program", order: 2, subSections: [] },
  ],
};

// ─── DOCUMENT Part Config ───
export const DOCUMENT_CONFIG: PartConfig = {
  key: FormPartKey.DOCUMENT,
  title: "Document",
  description: "Required documents",
  order: 3,
  sections: [
    { key: "yourDocuments", title: "Your Documents", order: 1, subSections: [] },
    { key: "coreDocuments", title: "CORE Documents", order: 2, subSections: [] },
  ],
};

// ─── PAYMENT Part Config ───
export const PAYMENT_CONFIG: PartConfig = {
  key: FormPartKey.PAYMENT,
  title: "Payment",
  description: "Payment information",
  order: 4,
  sections: [
    {
      key: "paymentInformation",
      title: "Payment Information",
      order: 1,
      subSections: [
        {
          key: "paymentDetails",
          title: "Payment Details",
          order: 1,
          isRepeatable: false,
          fields: [
            { key: "paymentStatus", label: "Payment Status", type: FieldType.TEXT, placeholder: "Payment status", required: false, order: 1 },
          ],
        },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════
// SERVICE → PARTS MAPPING
// ═══════════════════════════════════════════════════════

/**
 * Which parts each service uses. Only Study Abroad has all 4.
 * Education Planning, Ivy League, IELTS, GRE have no form parts.
 */
export const SERVICE_FORM_PARTS: Record<string, PartConfig[]> = {
  "study-abroad": [PROFILE_CONFIG, APPLICATION_CONFIG, DOCUMENT_CONFIG, PAYMENT_CONFIG],
  // add more services here if they need forms in the future
};

/**
 * Profile sections shown on the /profile page (no registration needed)
 */
export const PROFILE_PAGE_SECTIONS = ["personalDetails", "parentalDetails", "academicQualification", "workExperience"];

/**
 * Get form structure for a service by slug
 */
export function getServiceFormStructure(serviceSlug: string): PartConfig[] {
  return SERVICE_FORM_PARTS[serviceSlug] || [];
}

/**
 * Get a specific part config by key
 */
export function getPartConfig(partKey: FormPartKey): PartConfig | undefined {
  const all = [PROFILE_CONFIG, APPLICATION_CONFIG, DOCUMENT_CONFIG, PAYMENT_CONFIG];
  return all.find(p => p.key === partKey);
}

/**
 * Find a section config within a part
 */
export function getSectionConfig(partKey: FormPartKey, sectionKey: string): SectionConfig | undefined {
  const part = getPartConfig(partKey);
  return part?.sections.find(s => s.key === sectionKey);
}

/**
 * Find a subsection config
 */
export function getSubSectionConfig(partKey: FormPartKey, sectionKey: string, subSectionKey: string): SubSectionConfig | undefined {
  const section = getSectionConfig(partKey, sectionKey);
  return section?.subSections.find(ss => ss.key === subSectionKey);
}
