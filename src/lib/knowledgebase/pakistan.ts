import "server-only";

export type PakistanProcessKey =
  | "domicile"
  | "passport"
  | "cnic"
  | "birth_certificate"
  | "nikah_nama"
  | "marriage_registration"
  | "rukhsati_certificate"
  | "mofa_attestation"
  | "hec_degree_attestation"
  | "board_degree_verification";

export type PakistanProcessKB = {
  key: PakistanProcessKey;
  title: string;
  commonNames: string[];
  scopeNotes: string[];
  requiredDocuments: string[];
  sometimesRequiredDocuments: string[];
  requiredInfoToCollect: string[];
  officialPortals: Array<{ name: string; url?: string; note?: string }>;
  disclaimers: string[];
};

/**
 * Minimal, stable “hackathon KB” for Pakistan processes.
 * Keep it short and high-signal; webSearch can refine details.
 */
export const PAKISTAN_PROCESS_KB: Record<PakistanProcessKey, PakistanProcessKB> =
  {
    domicile: {
      key: "domicile",
      title: "Domicile Certificate (Pakistan)",
      commonNames: ["domicile", "proof of domicile", "domicile certificate"],
      scopeNotes: [
        "Issuing authority and exact checklist vary by province/district.",
        "Often handled via DC/DCO office, revenue/administration office, or provincial e-Services portal.",
      ],
      requiredDocuments: [
        "Applicant CNIC (original + copy) / B-Form for minors",
        "Recent photographs (passport-size)",
        "Proof of permanent residence (e.g. utility bill / rent agreement / house ownership docs) as accepted locally",
        "Father/mother/guardian CNIC copies (as applicable)",
      ],
      sometimesRequiredDocuments: [
        "Union Council / local verification letter",
        "Affidavit (on stamp paper) for residence / non-issuance / particulars",
        "School/college certificate or record (for students, in some districts)",
        "Marriage certificate (for women changing domicile details, where applicable)",
      ],
      requiredInfoToCollect: [
        "Full name (as per CNIC/B-Form)",
        "CNIC/B-Form number",
        "Date of birth",
        "Permanent address (district/tehsil/UC)",
        "Current address (if different)",
        "Father/mother/guardian name + CNIC (as applicable)",
        "Reason/purpose (education/employment/etc.)",
      ],
      officialPortals: [
        {
          name: "Punjab e-Services",
          url: "https://eservices.punjab.gov.pk",
          note: "Common portal used for some domicile-related services in Punjab (availability varies).",
        },
      ],
      disclaimers: [
        "This is a general checklist; always confirm with the district office/portal for your jurisdiction.",
      ],
    },
    passport: {
      key: "passport",
      title: "Pakistan Passport (DGIP)",
      commonNames: ["passport", "DGIP passport", "machine readable passport"],
      scopeNotes: [
        "Online + in-person biometric steps vary by category (new/renewal/replacement).",
        "Fees and timelines change; verify on official portals.",
      ],
      requiredDocuments: [
        "Original CNIC / NICOP (and a photocopy if required by center)",
        "Passport-size photographs (if required for your category/center)",
      ],
      sometimesRequiredDocuments: [
        "Previous passport (for renewal) / lost passport report (for replacement)",
        "FIR / police report (for lost/stolen) and any penalty challan (where applicable)",
        "Birth certificate / B-Form (for minors) + parents’ CNIC copies",
        "Marriage certificate (sometimes requested for name changes) / gazette notification (where applicable)",
      ],
      requiredInfoToCollect: [
        "Full name (as per CNIC/NICOP)",
        "CNIC/NICOP number",
        "Date of birth",
        "Place of birth",
        "Address (present + permanent)",
        "Contact number and email",
        "Emergency contact details",
      ],
      officialPortals: [
        {
          name: "DGIP Online Passport System",
          url: "https://passport.gov.pk",
          note: "Official DGIP portal (online application where available).",
        },
      ],
      disclaimers: [
        "Your nearest RPO/consulate may have category-specific instructions.",
      ],
    },
    cnic: {
      key: "cnic",
      title: "CNIC / Smart CNIC (NADRA)",
      commonNames: ["cnic", "smart cnic", "nadra cnic", "identity card"],
      scopeNotes: [
        "Requirements differ for new CNIC, modification, duplicate, and renewal.",
        "For some cases, NADRA may require biometric verification and supporting proofs.",
      ],
      requiredDocuments: [
        "B-Form / CRC (for first-time CNIC at 18) or existing CNIC for renewal/modification",
        "One or more verification/support documents as asked by NADRA (case-dependent)",
      ],
      sometimesRequiredDocuments: [
        "Birth certificate (if requested)",
        "Marriage certificate (for spouse name change)",
        "Educational certificate (sometimes used as supporting proof)",
        "Proof of residence (utility bill, etc.) for address update (as requested)",
      ],
      requiredInfoToCollect: [
        "Full name",
        "Father/mother name",
        "Date of birth",
        "Place of birth",
        "Permanent and present address",
        "Mobile number",
      ],
      officialPortals: [
        {
          name: "NADRA",
          url: "https://www.nadra.gov.pk",
          note: "Official NADRA site (service details and center info).",
        },
      ],
      disclaimers: [
        "NADRA may ask for different supporting documents depending on your case and record.",
      ],
    },
    birth_certificate: {
      key: "birth_certificate",
      title: "Birth Certificate (Pakistan) / Child Registration",
      commonNames: [
        "birth certificate",
        "child registration",
        "union council birth certificate",
        "crc",
        "b-form",
      ],
      scopeNotes: [
        "Two common tracks: Union Council birth certificate (local government) and NADRA child registration (CRC/B-Form).",
        "Exact requirements vary by province/UC and by whether the birth is within or after the reporting window.",
      ],
      requiredDocuments: [
        "Parents’ CNIC copies (and originals if applying in person)",
        "Hospital/clinic birth report or discharge summary (if available)",
      ],
      sometimesRequiredDocuments: [
        "Nikah Nama / marriage registration proof (often requested for parents’ relationship proof)",
        "Affidavit (late registration or missing hospital record)",
        "Witness CNIC copies (UC-dependent)",
        "Vaccination card / school admission letter (late registration supporting proof)",
      ],
      requiredInfoToCollect: [
        "Child name (if decided) and gender",
        "Date/time and place of birth",
        "Father and mother names + CNIC numbers",
        "Parents’ addresses (permanent/present) and UC/ward details",
      ],
      officialPortals: [
        {
          name: "NADRA",
          url: "https://www.nadra.gov.pk",
          note: "For CRC / B-Form flows and service guidance.",
        },
      ],
      disclaimers: [
        "Union Council requirements differ; confirm the UC form and supporting proofs for your locality.",
      ],
    },
    nikah_nama: {
      key: "nikah_nama",
      title: "Nikah Nama (Marriage Contract) — Pakistan",
      commonNames: ["nikah", "nikah nama", "marriage contract"],
      scopeNotes: [
        "Nikah is performed by a Nikah Registrar; documentation needs vary by province/UC.",
        "For official use, you typically need registration (marriage certificate) in addition to the Nikah Nama.",
      ],
      requiredDocuments: [
        "Bride and groom CNIC copies (and originals for verification)",
        "Passport-size photographs (often requested)",
        "Witness CNIC copies (usually 2 witnesses)",
      ],
      sometimesRequiredDocuments: [
        "Divorce/death certificate of previous spouse (if applicable)",
        "Guardian/Wali details or consent documents (case-dependent)",
      ],
      requiredInfoToCollect: [
        "Bride and groom full names (as per CNIC)",
        "CNIC numbers",
        "Addresses",
        "Witness names + CNIC numbers",
        "Mehr amount and terms (as agreed)",
        "Nikah date and place",
      ],
      officialPortals: [
        {
          name: "Local government / Union Council",
          note: "Registration is typically handled via UC / municipal administration depending on area.",
        },
      ],
      disclaimers: [
        "Exact forms and stamping requirements differ by jurisdiction; confirm with the Nikah Registrar/UC.",
      ],
    },
    marriage_registration: {
      key: "marriage_registration",
      title: "Marriage Registration Certificate (Pakistan)",
      commonNames: ["marriage certificate", "marriage registration", "union council marriage certificate"],
      scopeNotes: [
        "Marriage registration is commonly handled by the Union Council / local government office.",
        "You may need both Nikah Nama and registration certificate for downstream attestation/visa cases.",
      ],
      requiredDocuments: [
        "Nikah Nama (original/certified copy) as available",
        "Bride and groom CNIC copies",
        "Witness CNIC copies",
      ],
      sometimesRequiredDocuments: [
        "Photographs",
        "Application form from UC / relevant office",
        "Fee challan/receipt (where applicable)",
      ],
      requiredInfoToCollect: [
        "Names, CNICs, and addresses of bride/groom",
        "Nikah date/place and registrar details",
        "Witness details",
      ],
      officialPortals: [
        {
          name: "Local government / Union Council",
          note: "Rules and fees vary by province and council.",
        },
      ],
      disclaimers: [
        "If you need the certificate for international use, check translation and attestation requirements early.",
      ],
    },
    rukhsati_certificate: {
      key: "rukhsati_certificate",
      title: "Rukhsati Certificate / Rukhsati Entry (Pakistan) — where applicable",
      commonNames: ["rukhsati", "rukhsati certificate", "rukhsati entry"],
      scopeNotes: [
        "Not universally issued as a standard government document; requirements vary by locality and use-case (e.g. some overseas/consular contexts).",
        "Often supported by a marriage certificate + affidavits and photos rather than a single standard certificate.",
      ],
      requiredDocuments: [
        "Marriage registration certificate / Nikah Nama",
        "Bride and groom CNIC copies",
      ],
      sometimesRequiredDocuments: [
        "Affidavit(s) describing date of rukhsati/consummation (as required by requesting authority)",
        "Photographs / event evidence (if requested)",
        "Witness statements/verification (case-dependent)",
      ],
      requiredInfoToCollect: [
        "Date and place of rukhsati (if applicable)",
        "Names/CNICs and relationship details",
        "Purpose (who is requesting it: embassy, court, etc.)",
      ],
      officialPortals: [
        {
          name: "Requesting authority guidance",
          note: "Follow the checklist of the embassy/authority asking for rukhsati evidence.",
        },
      ],
      disclaimers: [
        "Treat this as a documentation/evidence pack task unless your local authority issues a specific certificate.",
      ],
    },
    mofa_attestation: {
      key: "mofa_attestation",
      title: "MOFA Document Attestation (Pakistan)",
      commonNames: ["mofa attestation", "ministry of foreign affairs attestation", "document legalization"],
      scopeNotes: [
        "MOFA attests documents for international use; many documents require prior verification by the issuing authority (e.g. HEC for degrees).",
        "Workflows differ for originals vs copies and for personal vs commercial documents.",
      ],
      requiredDocuments: [
        "Original document(s) to be attested (or as required)",
        "Applicant CNIC (copy) / authorized representative ID (if applicable)",
      ],
      sometimesRequiredDocuments: [
        "Prior verification/attestation from issuing authority (e.g. HEC for degrees, boards for certificates)",
        "Appointment/online token printout (if the center requires it)",
        "Authority letter (if submitting via representative)",
      ],
      requiredInfoToCollect: [
        "Document type(s) and issuing body",
        "Whether it is for personal or commercial use",
        "Country/purpose (sometimes asked for processing category)",
      ],
      officialPortals: [
        {
          name: "Ministry of Foreign Affairs (Pakistan)",
          url: "https://mofa.gov.pk",
          note: "Look for attestation center guidance and requirements.",
        },
      ],
      disclaimers: [
        "Confirm whether your destination country also needs embassy legalization after MOFA.",
      ],
    },
    hec_degree_attestation: {
      key: "hec_degree_attestation",
      title: "HEC Degree Attestation (Pakistan)",
      commonNames: ["hec attestation", "degree attestation", "hec degree verification"],
      scopeNotes: [
        "HEC typically requires online application + appointment/token.",
        "HEC may verify with your university before attesting; timelines depend on institution response.",
      ],
      requiredDocuments: [
        "Original degree(s) and transcripts/marksheets (as required by HEC category)",
        "Applicant CNIC (copy) / passport (for overseas, case-dependent)",
      ],
      sometimesRequiredDocuments: [
        "University verification letter (if requested)",
        "Online application printout / token / appointment slip",
        "Authority letter if someone else is submitting (if allowed)",
      ],
      requiredInfoToCollect: [
        "University name and campus",
        "Degree title, year, roll/enrollment number",
        "Applicant name (as per degree and CNIC) and CNIC number",
      ],
      officialPortals: [
        {
          name: "Higher Education Commission (HEC)",
          url: "https://hec.gov.pk",
          note: "Attestation guidance and (where applicable) online application portal links.",
        },
      ],
      disclaimers: [
        "Before MOFA attestation, confirm if HEC attestation is required for your document type.",
      ],
    },
    board_degree_verification: {
      key: "board_degree_verification",
      title: "Board / University Verification (Matric/Inter/Degree) — Pakistan",
      commonNames: ["board verification", "ibcc verification", "degree verification", "result verification"],
      scopeNotes: [
        "Different bodies handle different levels: boards (Matric/Inter), universities (degree), IBCC for equivalence/attestation in some flows.",
        "You may need verification before HEC/MOFA or before applying abroad.",
      ],
      requiredDocuments: [
        "Original certificate(s) and marksheets (or copies if the service is for verification only)",
        "Applicant CNIC copy",
      ],
      sometimesRequiredDocuments: [
        "Fee challan/receipt",
        "Application form and photographs (board-dependent)",
        "Authority letter (if applying via representative)",
      ],
      requiredInfoToCollect: [
        "Board/university name",
        "Roll number, year, and exam session",
        "Candidate name (as on certificate)",
      ],
      officialPortals: [
        {
          name: "Relevant Board/University portal",
          note: "Use the portal/service center of the issuing board/university for verification steps and fees.",
        },
        {
          name: "IBCC (if applicable)",
          url: "https://ibcc.edu.pk",
          note: "For certain attestation/equivalence workflows (case-dependent).",
        },
      ],
      disclaimers: [
        "The correct path depends on document level and destination requirement; confirm who must verify first.",
      ],
    },
  };

export function getKbForProcessType(
  processType: string,
): PakistanProcessKB | null {
  const key = processType.toLowerCase().trim();
  if (key === "domicile") return PAKISTAN_PROCESS_KB.domicile;
  if (key === "passport") return PAKISTAN_PROCESS_KB.passport;
  // Extractor schema does not include cnic as a primary processType, but user may ask.
  if (key === "cnic") return PAKISTAN_PROCESS_KB.cnic;
  if (key === "birth_certificate") return PAKISTAN_PROCESS_KB.birth_certificate;
  if (key === "nikah_nama") return PAKISTAN_PROCESS_KB.nikah_nama;
  if (key === "marriage_registration")
    return PAKISTAN_PROCESS_KB.marriage_registration;
  if (key === "rukhsati_certificate")
    return PAKISTAN_PROCESS_KB.rukhsati_certificate;
  if (key === "mofa_attestation") return PAKISTAN_PROCESS_KB.mofa_attestation;
  if (key === "hec_degree_attestation")
    return PAKISTAN_PROCESS_KB.hec_degree_attestation;
  if (key === "board_degree_verification")
    return PAKISTAN_PROCESS_KB.board_degree_verification;
  return null;
}

