import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "./models/Service";
import FormPart, { FormPartKey } from "./models/FormPart";
import ServiceFormPart from "./models/ServiceFormPart";
import FormSection from "./models/FormSection";
import FormSubSection from "./models/FormSubSection";
import StudentFormAnswer from "./models/StudentFormAnswer";
import StudentServiceRegistration from "./models/StudentServiceRegistration";
import FormField, { FieldType } from "./models/FormField";

dotenv.config();

const seedFormData = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🗑️  Clearing existing form data...");
    await FormField.deleteMany({});
    await FormSubSection.deleteMany({});
    await FormSection.deleteMany({});
    await ServiceFormPart.deleteMany({});
    await FormPart.deleteMany({});
    await Service.deleteMany({});
    await StudentFormAnswer.deleteMany({});
    await StudentServiceRegistration.deleteMany({});

    // ========== STEP 1: Create Services ==========
    console.log("📦 Creating services...");
    const services = await Service.insertMany([
      {
        name: "Education Planning",
        slug: "education-planning",
        description:
          "Comprehensive education planning services to help you chart your academic journey",
        shortDescription: "Plan your educational path with expert guidance",
        learnMoreUrl: "https://www.kareerstudio.com/education-n-career-planning.html",
        isActive: true,
        order: 1,
      },
      {
        name: "Study Abroad",
        slug: "study-abroad",
        description:
          "Complete support for studying abroad including university selection, applications, and visa assistance",
        shortDescription: "Your gateway to international education",
        learnMoreUrl: "https://www.kareerstudio.com/study-abroad.html",
        isActive: true,
        order: 2,
      },
      {
        name: "Ivy League Preparation",
        slug: "ivy-league",
        description:
          "Specialized preparation for Ivy League and top-tier university admissions",
        shortDescription: "Elite university admission preparation",
        learnMoreUrl: "",
        isActive: true,
        order: 3,
      },
      {
        name: "IELTS Coaching",
        slug: "ielts-coaching",
        description:
          "Expert IELTS coaching to help you achieve your target band score",
        shortDescription: "Achieve your target IELTS score",
        learnMoreUrl: "https://www.kareerstudio.com/ielts.html",
        isActive: true,
        order: 4,
      },
      {
        name: "GRE Coaching",
        slug: "gre-coaching",
        description:
          "Comprehensive GRE preparation for graduate school admissions",
        shortDescription: "Master the GRE with expert coaching",
        learnMoreUrl: "https://www.kareerstudio.com/gre.html",
        isActive: true,
        order: 5,
      },
    ]);

    const studyAbroadService = services.find((s) => s.slug === "study-abroad")!;

    // ========== STEP 2: Create Form Parts ==========
    console.log("📋 Creating form parts...");
    const formParts = await FormPart.insertMany([
      {
        key: FormPartKey.PROFILE,
        title: "Profile",
        description: "Complete your personal and academic profile",
        order: 1,
        isActive: true,
      },
      {
        key: FormPartKey.APPLICATION,
        title: "Application",
        description: "Apply to universities and programs",
        order: 2,
        isActive: true,
      },
      {
        key: FormPartKey.DOCUMENT,
        title: "Documents",
        description: "Upload required documents",
        order: 3,
        isActive: true,
      },
      {
        key: FormPartKey.PAYMENT,
        title: "Payment",
        description: "Complete payment process",
        order: 4,
        isActive: true,
      },
    ]);

    const profilePart = formParts.find((p) => p.key === FormPartKey.PROFILE)!;
    const applicationPart = formParts.find(
      (p) => p.key === FormPartKey.APPLICATION
    )!;
    const documentPart = formParts.find((p) => p.key === FormPartKey.DOCUMENT)!;
    const paymentPart = formParts.find((p) => p.key === FormPartKey.PAYMENT)!;

    // ========== STEP 3: Link Parts to Study Abroad Service ==========
    console.log("🔗 Linking form parts to Study Abroad service...");
    await ServiceFormPart.insertMany([
      {
        serviceId: studyAbroadService._id,
        partId: profilePart._id,
        order: 1,
        isActive: true,
        isRequired: true,
      },
      {
        serviceId: studyAbroadService._id,
        partId: applicationPart._id,
        order: 2,
        isActive: true,
        isRequired: true,
      },
      {
        serviceId: studyAbroadService._id,
        partId: documentPart._id,
        order: 3,
        isActive: true,
        isRequired: true,
      },
      {
        serviceId: studyAbroadService._id,
        partId: paymentPart._id,
        order: 4,
        isActive: true,
        isRequired: false,
      },
    ]);

    // ========== STEP 4: Create PROFILE Sections (Reusable across all services) ==========
    console.log("📝 Creating PROFILE sections...");
    const profileSections = await FormSection.insertMany([
      {
        partId: profilePart._id,
        title: "Personal Details",
        description: "Your personal information",
        order: 1,
        isActive: true,
      },
      {
        partId: profilePart._id,
        title: "Academic Qualification",
        description: "Your educational background",
        order: 2,
        isActive: true,
      },
      {
        partId: profilePart._id,
        title: "Work Experience",
        description: "Your professional experience",
        order: 3,
        isActive: true,
      },
      {
        partId: profilePart._id,
        title: "Tests",
        description: "Standardized test scores",
        order: 4,
        isActive: true,
      },
    ]);

    const personalDetailsSection = profileSections[0];
    const academicSection = profileSections[1];
    const workExperienceSection = profileSections[2];
    const testsSection = profileSections[3];

    // ========== STEP 5: Create Personal Details SubSections ==========
    console.log("📄 Creating Personal Details subsections...");
    const personalSubSections = await FormSubSection.insertMany([
      {
        sectionId: personalDetailsSection._id,
        title: "Personal Information",
        order: 1,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Mailing Address",
        order: 2,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Permanent Address",
        order: 3,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Passport Information",
        order: 4,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Nationality",
        order: 5,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Background Information",
        order: 6,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: personalDetailsSection._id,
        title: "Additional Information",
        order: 7,
        isRepeatable: false,
        isActive: true,
      },
    ]);

    // ========== STEP 6: Create Personal Information Fields ==========
    console.log("🔤 Creating Personal Information fields...");
    await FormField.insertMany([
      {
        subSectionId: personalSubSections[0]._id,
        label: "First Name",
        key: "firstName",
        type: FieldType.TEXT,
        placeholder: "Enter your first name",
        required: true,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Middle Name",
        key: "middleName",
        type: FieldType.TEXT,
        placeholder: "Enter your middle name",
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Last Name",
        key: "lastName",
        type: FieldType.TEXT,
        placeholder: "Enter your last name",
        required: true,
        order: 3,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Date of Birth",
        key: "dob",
        type: FieldType.DATE,
        required: true,
        order: 4,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Birth City",
        key: "birthcity",
        type: FieldType.TEXT,
        placeholder: "City",
        required: true,
        order: 5,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Gender",
        key: "gender",
        type: FieldType.SELECT,
        required: true,
        order: 6,
        isActive: true,
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Other", value: "other" },
        ],
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Marital Status",
        key: "maritalStatus",
        type: FieldType.SELECT,
        required: true,
        order: 7,
        isActive: true,
        options: [
          { label: "Single", value: "single" },
          { label: "Married", value: "married" },
          { label: "Divorced", value: "divorced" },
          { label: "Widowed", value: "widowed" },
        ],
      },
      {
        subSectionId: personalSubSections[0]._id,
        label: "Phone Number",
        key: "phone",
        type: FieldType.PHONE,
        placeholder: "+1 (555) 000-0000",
        required: true,
        order: 8,
        isActive: true,
      },
    ]);

    // ========== STEP 7: Create Mailing Address Fields ==========
    console.log("📮 Creating Mailing Address fields...");
    await FormField.insertMany([
      {
        subSectionId: personalSubSections[1]._id,
        label: "Address Line 1",
        key: "mailingAddress1",
        type: FieldType.TEXT,
        placeholder: "Street address",
        required: true,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[1]._id,
        label: "Address Line 2",
        key: "mailingAddress2",
        type: FieldType.TEXT,
        placeholder: "Apartment, suite, etc.",
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[1]._id,
        label: "Country",
        key: "mailingCountry",
        type: FieldType.SELECT,
        required: true,
        order: 3,
        isActive: true,
        options: [],  // Will be populated dynamically
        defaultValue: "IN",  // Default to India
      },
      {
        subSectionId: personalSubSections[1]._id,
        label: "State/Province",
        key: "mailingState",
        type: FieldType.SELECT,
        required: true,
        order: 4,
        isActive: true,
        options: [],  // Will be populated based on country
      },
      {
        subSectionId: personalSubSections[1]._id,
        label: "City",
        key: "mailingCity",
        type: FieldType.TEXT,
        placeholder: "Enter city name",
        required: true,
        order: 5,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[1]._id,
        label: "Postal Code",
        key: "mailingPostalCode",
        type: FieldType.TEXT,
        required: true,
        order: 6,
        isActive: true,
      },
    ]);

    // ========== STEP 8: Create Permanent Address Fields ==========
    console.log("🏠 Creating Permanent Address fields...");
    await FormField.insertMany([
      {
        subSectionId: personalSubSections[2]._id,
        label: "Same as Mailing Address",
        key: "sameAsMailingAddress",
        type: FieldType.CHECKBOX,
        required: false,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "Address Line 1",
        key: "permanentAddress1",
        type: FieldType.TEXT,
        placeholder: "Street address",
        required: true,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "Address Line 2",
        key: "permanentAddress2",
        type: FieldType.TEXT,
        placeholder: "Apartment, suite, etc.",
        required: false,
        order: 4,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "Country",
        key: "permanentCountry",
        type: FieldType.SELECT,
        required: true,
        order: 5,
        isActive: true,
        options: [],  // Will be populated dynamically
        defaultValue: "IN",  // Default to India
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "State/Province",
        key: "permanentState",
        type: FieldType.SELECT,
        required: true,
        order: 6,
        isActive: true,
        options: [],  // Will be populated based on country
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "City",
        key: "permanentCity",
        type: FieldType.TEXT,
        placeholder: "Enter city name",
        required: true,
        order: 7,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[2]._id,
        label: "Postal Code",
        key: "permanentPostalCode",
        type: FieldType.TEXT,
        required: true,
        order: 8,
        isActive: true,
      },
    ]);

    // ========== STEP 9: Create Passport Information Fields ==========
    console.log("🛂 Creating Passport Information fields...");
    await FormField.insertMany([
      {
        subSectionId: personalSubSections[3]._id,
        label: "Passport Number",
        key: "passportNumber",
        type: FieldType.TEXT,
        placeholder: "Enter passport number",
        required: true,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[3]._id,
        label: "Passport Issue Date",
        key: "passportIssueDate",
        type: FieldType.DATE,
        required: true,
        order: 3,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[3]._id,
        label: "Passport Expiry Date",
        key: "passportExpiryDate",
        type: FieldType.DATE,
        required: true,
        order: 4,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[3]._id,
        label: "Place of Issue",
        key: "passportPlaceOfIssue",
        type: FieldType.TEXT,
        required: true,
        order: 2,
        isActive: true,
      },
    ]);

    // ========== STEP 9.5: Create Nationality, Background, Additional Info Fields ==========
    console.log("🌍 Creating Nationality, Background, Additional subsection fields...");
    await FormField.insertMany([
      {
        subSectionId: personalSubSections[4]._id,
        label: "Country of Citizenship",
        key: "citizenship",
        type: FieldType.COUNTRY,
        required: true,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[4]._id,
        label: "Country of Birth",
        key: "countryOfBirth",
        type: FieldType.COUNTRY,
        required: true,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: personalSubSections[5]._id,
        label: "Background Information",
        key: "backgroundInfo",
        type: FieldType.TEXTAREA,
        placeholder: "Provide any relevant background information about yourself",
        required: false,
        order: 1,
        isActive: true,
        helpText: "Tell us about your educational and professional background"
      },
      {
        subSectionId: personalSubSections[6]._id,
        label: "Additional Information",
        key: "additionalInfo",
        type: FieldType.TEXTAREA,
        placeholder: "Any additional information you would like to share",
        required: false,
        order: 1,
        isActive: true,
        helpText: "Include any other relevant details"
      },
    ]);

    // ========== STEP 10: Create Academic Qualification SubSection ==========
    console.log("🎓 Creating Academic Qualification subsections...");
    const academicSubSection = await FormSubSection.create({
      sectionId: academicSection._id,
      title: "Education Summary",
      description: "Add your educational qualifications",
      order: 1,
      isRepeatable: true,
      maxRepeat: 10,
      isActive: true,
    });

    await FormField.insertMany([
      {
        subSectionId: academicSubSection._id,
        label: "Level of Education",
        key: "educationLevel",
        type: FieldType.SELECT,
        required: true,
        order: 1,
        isActive: true,
        options: [
          { label: "High School", value: "high_school" },
          { label: "Associate Degree", value: "associate" },
          { label: "Bachelor's Degree", value: "bachelors" },
          { label: "Master's Degree", value: "masters" },
          { label: "Doctorate", value: "doctorate" },
        ],
      },
      {
        subSectionId: academicSubSection._id,
        label: "Institution Name",
        key: "institutionName",
        type: FieldType.TEXT,
        placeholder: "Enter institution name",
        required: true,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "Country",
        key: "institutionCountry",
        type: FieldType.COUNTRY,
        required: true,
        order: 3,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "Field of Study",
        key: "fieldOfStudy",
        type: FieldType.TEXT,
        placeholder: "e.g., Computer Science",
        required: true,
        order: 4,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "Start Date",
        key: "startDate",
        type: FieldType.DATE,
        required: true,
        order: 5,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "End Date",
        key: "endDate",
        type: FieldType.DATE,
        required: false,
        order: 6,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "Total Marks",
        key: "totalMarks",
        type: FieldType.SELECT,
        required: true,
        order: 7,
        isActive: true,
        options: [
          { label: "Out of 4", value: "4" },
          { label: "Out of 5", value: "5" },
          { label: "Out of 10", value: "10" },
          { label: "Out of 100", value: "100" },
        ],
      },
      {
        subSectionId: academicSubSection._id,
        label: "GPA/Percentage",
        key: "gpa",
        type: FieldType.TEXT,
        placeholder: "e.g., 3.8 or 85%",
        required: true,
        order: 8,
        isActive: true,
      },
      {
        subSectionId: academicSubSection._id,
        label: "Currently Studying",
        key: "currentlyStudying",
        type: FieldType.CHECKBOX,
        required: false,
        order: 9,
        isActive: true,
      },
    ]);

    // ========== STEP 11: Create Work Experience SubSection ==========
    console.log("💼 Creating Work Experience subsections...");
    const workSubSection = await FormSubSection.create({
      sectionId: workExperienceSection._id,
      title: "Work Experience/Internship",
      description: "Add your work experience",
      order: 1,
      isRepeatable: true,
      maxRepeat: 10,
      isActive: true,
    });

    await FormField.insertMany([
      {
        subSectionId: workSubSection._id,
        label: "Company Name",
        key: "companyName",
        type: FieldType.TEXT,
        placeholder: "Enter company name",
        required: true,
        order: 1,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Job Title",
        key: "jobTitle",
        type: FieldType.TEXT,
        placeholder: "Enter your job title",
        required: true,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Country",
        key: "workCountry",
        type: FieldType.COUNTRY,
        required: true,
        order: 3,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Currently Working",
        key: "currentlyWorking",
        type: FieldType.CHECKBOX,
        required: false,
        order: 4,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Start Date",
        key: "workStartDate",
        type: FieldType.DATE,
        required: true,
        order: 5,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "End Date",
        key: "workEndDate",
        type: FieldType.DATE,
        required: false,
        order: 6,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Reporting Manager",
        key: "reportingManager",
        type: FieldType.TEXT,
        placeholder: "Enter supervisor/manager name",
        required: false,
        order: 7,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Official Mail of Reporting Manager",
        key: "reportingToEmail",
        type: FieldType.EMAIL,
        placeholder: "Enter supervisor/manager email",
        required: false,
        order: 8,
        isActive: true,
      },
      {
        subSectionId: workSubSection._id,
        label: "Job Description",
        key: "jobDescription",
        type: FieldType.TEXTAREA,
        placeholder: "Describe your responsibilities",
        required: false,
        order: 9,
        isActive: true,
      },
    ]);

    // ========== STEP 12: Create Tests SubSections ==========
    console.log("📊 Creating Tests subsections...");
    const testSubSections = await FormSubSection.insertMany([
      {
        sectionId: testsSection._id,
        title: "IELTS",
        order: 1,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "GRE",
        order: 2,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "SAT",
        order: 3,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "PTE",
        order: 4,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "TOEFL",
        order: 5,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "GMAT",
        order: 6,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: testsSection._id,
        title: "Duolingo",
        order: 7,
        isRepeatable: false,
        isActive: true,
      },
    ]);

    // ========== STEP 13: Create Test Fields ==========
    console.log("📝 Creating Test fields...");
    
    // IELTS Fields (testSubSections[0])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[0]._id,
        label: "Have you taken IELTS?",
        key: "hasTakenIELTS",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "TRF Number",
        key: "ieltsTRFNumber",
        type: FieldType.TEXT,
        placeholder: "Test Report Form Number",
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Overall Band Score",
        key: "ieltsOverall",
        type: FieldType.NUMBER,
        placeholder: "0-9",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 0, max: 9 },
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Listening Score",
        key: "ieltsListening",
        type: FieldType.NUMBER,
        placeholder: "0-9",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 0, max: 9 },
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Reading Score",
        key: "ieltsReading",
        type: FieldType.NUMBER,
        placeholder: "0-9",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 0, max: 9 },
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Writing Score",
        key: "ieltsWriting",
        type: FieldType.NUMBER,
        placeholder: "0-9",
        required: false,
        order: 6,
        isActive: true,
        validation: { min: 0, max: 9 },
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Speaking Score",
        key: "ieltsSpeaking",
        type: FieldType.NUMBER,
        placeholder: "0-9",
        required: false,
        order: 7,
        isActive: true,
        validation: { min: 0, max: 9 },
      },
      {
        subSectionId: testSubSections[0]._id,
        label: "Test Date",
        key: "ieltsTestDate",
        type: FieldType.DATE,
        required: false,
        order: 8,
        isActive: true,
      },
    ]);

    // GRE Fields (testSubSections[1])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[1]._id,
        label: "Have you taken GRE?",
        key: "hasTakenGRE",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[1]._id,
        label: "Test Date",
        key: "greTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[1]._id,
        label: "Verbal Score",
        key: "greVerbal",
        type: FieldType.NUMBER,
        placeholder: "130-170",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 130, max: 170 },
      },
      {
        subSectionId: testSubSections[1]._id,
        label: "Quantitative Score",
        key: "greQuantitative",
        type: FieldType.NUMBER,
        placeholder: "130-170",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 130, max: 170 },
      },
      {
        subSectionId: testSubSections[1]._id,
        label: "Analytical Writing Score",
        key: "greWriting",
        type: FieldType.NUMBER,
        placeholder: "0-6",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 0, max: 6 },
      },
      {
        subSectionId: testSubSections[1]._id,
        label: "Registration Number",
        key: "greRegistrationNumber",
        type: FieldType.TEXT,
        placeholder: "GRE Registration/Appointment Number",
        required: false,
        order: 6,
        isActive: true,
      },
    ]);

    // SAT Fields (testSubSections[2])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[2]._id,
        label: "Have you taken SAT?",
        key: "hasTakenSAT",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[2]._id,
        label: "Test Date",
        key: "satTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[2]._id,
        label: "Total Score",
        key: "satTotal",
        type: FieldType.NUMBER,
        placeholder: "400-1600",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 400, max: 1600 },
      },
      {
        subSectionId: testSubSections[2]._id,
        label: "Evidence-Based Reading and Writing",
        key: "satReadingWriting",
        type: FieldType.NUMBER,
        placeholder: "200-800",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 200, max: 800 },
      },
      {
        subSectionId: testSubSections[2]._id,
        label: "Math Score",
        key: "satMath",
        type: FieldType.NUMBER,
        placeholder: "200-800",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 200, max: 800 },
      },
      {
        subSectionId: testSubSections[2]._id,
        label: "Registration Number",
        key: "satRegistrationNumber",
        type: FieldType.TEXT,
        placeholder: "SAT Registration Number",
        required: false,
        order: 6,
        isActive: true,
      },
    ]);

    // PTE Fields (testSubSections[3])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[3]._id,
        label: "Have you taken PTE?",
        key: "hasTakenPTE",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Test Date",
        key: "pteTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Overall Score",
        key: "pteOverall",
        type: FieldType.NUMBER,
        placeholder: "10-90",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 10, max: 90 },
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Listening",
        key: "pteListening",
        type: FieldType.NUMBER,
        placeholder: "10-90",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 10, max: 90 },
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Reading",
        key: "pteReading",
        type: FieldType.NUMBER,
        placeholder: "10-90",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 10, max: 90 },
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Writing",
        key: "pteWriting",
        type: FieldType.NUMBER,
        placeholder: "10-90",
        required: false,
        order: 6,
        isActive: true,
        validation: { min: 10, max: 90 },
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Speaking",
        key: "pteSpeaking",
        type: FieldType.NUMBER,
        placeholder: "10-90",
        required: false,
        order: 7,
        isActive: true,
        validation: { min: 10, max: 90 },
      },
      {
        subSectionId: testSubSections[3]._id,
        label: "Score Report Code",
        key: "pteScoreReportCode",
        type: FieldType.TEXT,
        placeholder: "PTE Score Report Code/Reference Number",
        required: false,
        order: 8,
        isActive: true,
      },
    ]);

    // TOEFL Fields (testSubSections[4])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[4]._id,
        label: "Have you taken TOEFL?",
        key: "hasTakenTOEFL",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Test Date",
        key: "toeflTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Total Score",
        key: "toeflTotal",
        type: FieldType.NUMBER,
        placeholder: "0-120",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 0, max: 120 },
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Reading",
        key: "toeflReading",
        type: FieldType.NUMBER,
        placeholder: "0-30",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 0, max: 30 },
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Listening",
        key: "toeflListening",
        type: FieldType.NUMBER,
        placeholder: "0-30",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 0, max: 30 },
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Speaking",
        key: "toeflSpeaking",
        type: FieldType.NUMBER,
        placeholder: "0-30",
        required: false,
        order: 6,
        isActive: true,
        validation: { min: 0, max: 30 },
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Writing",
        key: "toeflWriting",
        type: FieldType.NUMBER,
        placeholder: "0-30",
        required: false,
        order: 7,
        isActive: true,
        validation: { min: 0, max: 30 },
      },
      {
        subSectionId: testSubSections[4]._id,
        label: "Registration Number",
        key: "toeflRegistrationNumber",
        type: FieldType.TEXT,
        placeholder: "TOEFL Registration/ETS ID",
        required: false,
        order: 8,
        isActive: true,
      },
    ]);

    // GMAT Fields (testSubSections[5])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[5]._id,
        label: "Have you taken GMAT?",
        key: "hasTakenGMAT",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Test Date",
        key: "gmatTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Total Score",
        key: "gmatTotal",
        type: FieldType.NUMBER,
        placeholder: "200-800",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 200, max: 800 },
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Verbal Score",
        key: "gmatVerbal",
        type: FieldType.NUMBER,
        placeholder: "0-60",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 0, max: 60 },
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Quantitative Score",
        key: "gmatQuantitative",
        type: FieldType.NUMBER,
        placeholder: "0-60",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 0, max: 60 },
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Analytical Writing",
        key: "gmatAWA",
        type: FieldType.NUMBER,
        placeholder: "0-6",
        required: false,
        order: 6,
        isActive: true,
        validation: { min: 0, max: 6 },
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Integrated Reasoning",
        key: "gmatIR",
        type: FieldType.NUMBER,
        placeholder: "1-8",
        required: false,
        order: 7,
        isActive: true,
        validation: { min: 1, max: 8 },
      },
      {
        subSectionId: testSubSections[5]._id,
        label: "Appointment Number",
        key: "gmatAppointmentNumber",
        type: FieldType.TEXT,
        placeholder: "GMAT Appointment/Registration Number",
        required: false,
        order: 8,
        isActive: true,
      },
    ]);

    // Duolingo Fields (testSubSections[6])
    await FormField.insertMany([
      {
        subSectionId: testSubSections[6]._id,
        label: "Have you taken Duolingo English Test?",
        key: "hasTakenDuolingo",
        type: FieldType.RADIO,
        required: false,
        order: 1,
        isActive: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
          { label: "Planning to take", value: "planning" },
        ],
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Test Date",
        key: "duolingoTestDate",
        type: FieldType.DATE,
        required: false,
        order: 2,
        isActive: true,
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Overall Score",
        key: "duolingoOverall",
        type: FieldType.NUMBER,
        placeholder: "10-160",
        required: false,
        order: 3,
        isActive: true,
        validation: { min: 10, max: 160 },
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Literacy",
        key: "duolingoLiteracy",
        type: FieldType.NUMBER,
        placeholder: "10-160",
        required: false,
        order: 4,
        isActive: true,
        validation: { min: 10, max: 160 },
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Conversation",
        key: "duolingoConversation",
        type: FieldType.NUMBER,
        placeholder: "10-160",
        required: false,
        order: 5,
        isActive: true,
        validation: { min: 10, max: 160 },
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Comprehension",
        key: "duolingoComprehension",
        type: FieldType.NUMBER,
        placeholder: "10-160",
        required: false,
        order: 6,
        isActive: true,
        validation: { min: 10, max: 160 },
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Production",
        key: "duolingoProduction",
        type: FieldType.NUMBER,
        placeholder: "10-160",
        required: false,
        order: 7,
        isActive: true,
        validation: { min: 10, max: 160 },
      },
      {
        subSectionId: testSubSections[6]._id,
        label: "Test ID",
        key: "duolingoTestID",
        type: FieldType.TEXT,
        placeholder: "Duolingo Test ID/Certificate Number",
        required: false,
        order: 8,
        isActive: true,
      },
    ]);

    // ========== STEP 14: Create APPLICATION Sections (Split into two) ==========
    console.log("📝 Creating APPLICATION sections...");
    
    // Section 1: Apply to Program
    await FormSection.create({
      partId: applicationPart._id,
      title: "Apply to Program",
      description: "Browse and select programs added by your OPS",
      order: 1,
      isActive: true,
    });

    // Section 2: Applied Program
    await FormSection.create({
      partId: applicationPart._id,
      title: "Applied Program",
      description: "View your selected programs with priority and intake",
      order: 2,
      isActive: true,
    });

    // Note: Program selection is now handled by custom component (ApplicationProgramSection)
    // No subsections or fields needed for these sections

    // ========== STEP 14.5: Create DOCUMENT Sections ==========
    console.log("📄 Creating DOCUMENT sections...");
    const documentSections = await FormSection.insertMany([
      {
        partId: documentPart._id,
        title: "Your Documents",
        description: "Upload your documents",
        order: 1,
        isActive: true,
      },
      {
        partId: documentPart._id,
        title: "CORE Documents",
        description: "Documents from Kareer Studio",
        order: 2,
        isActive: true,
      },
    ]);

    console.log("📂 Creating document subsections...");
    await FormSubSection.insertMany([
      {
        sectionId: documentSections[0]._id,
        title: "Primary Documents",
        order: 1,
        isRepeatable: false,
        isActive: true,
      },
      {
        sectionId: documentSections[0]._id,
        title: "Secondary Documents",
        order: 2,
        isRepeatable: false,
        isActive: true,
      },
    ]);

    // ========== STEP 15: Create PAYMENT Section (Placeholder) ==========
    console.log("💳 Creating PAYMENT section...");
    const paymentSection = await FormSection.create({
      partId: paymentPart._id,
      title: "Payment Information",
      description: "Complete your payment (Coming Soon)",
      order: 1,
      isActive: true,
    });

    const paymentSubSection = await FormSubSection.create({
      sectionId: paymentSection._id,
      title: "Payment Details",
      description: "Payment gateway integration coming soon",
      order: 1,
      isRepeatable: false,
      isActive: true,
    });

    // Placeholder field
    await FormField.create({
      subSectionId: paymentSubSection._id,
      label: "Payment Status",
      key: "paymentStatus",
      type: FieldType.TEXT,
      placeholder: "Payment integration coming soon",
      required: false,
      order: 1,
      isActive: true,
      helpText: "This section will be available once payment gateway is integrated",
    });

    console.log("   - Study Abroad form structure created with:");
    console.log("     • Personal Details (7 subsections)");
    console.log("     • Academic Qualification (repeatable)");
    console.log("     • Work Experience (repeatable)");
    console.log("     • Tests (6 test types)");
    console.log("     • Application (program selection)");
    console.log("     • Documents (2 sections)");
    console.log("     • Payment (placeholder)");

    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedFormData();


