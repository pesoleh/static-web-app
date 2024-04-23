'use strict';

/* exported linkedinProfileRegEx */
// Reg Ex matching linkedin profile, for instance: https://www.linkedin.com/in/lyudmyla-malyuk-794b6596/
const linkedinProfileRegEx = /^(https:\/\/www\.linkedin\.com\/in\/((?!unavailable\b)([^?/\n]+)((\/([0-9a-f]{1,3})){3})?[/]?))/;
/* exported linkedinRecruiterProfileRegEx */
// Reg Ex matching linkedin profile on Recruiter, for instance: https://www.linkedin.com/talent/hire/719304738/manage/all/profile/AEMAAB5Tq-cBsiyPUiQafba10HYJkexHujzjtyg?project=719304738&start=0
const linkedinRecruiterProfileRegEx = /^(https:\/\/www\.linkedin\.com\/talent(\/.*)?\/profile\/([0-9a-zA-Z-_=]+))/;
/* exported linkedinSearchPeoplePageRegEx */
// Reg Ex matching linkedin profile, for instance: https://www.linkedin.com/search/results/people...
const linkedinSearchPeoplePageRegEx = /^(https:\/\/www\.linkedin\.com\/search\/results\/(all|people)\/)/;
/* exported LINKEDIN */
const LINKEDIN = {
    sessionCookieName: 'JSESSIONID',
    skypeType: 'SKYPE'
};

const noAccessModeCookieName = 'chromeExtensionNoAccessMode';

// No access action title
const noAccessTitle = 'You do not have permissions to execute this action';

const noAccessErrorMessage = 'You have no access to SB Chrome Extension. Please uninstall it from your browser.'

/* exported comparisonTypes */
const comparisonTypes = {
    skype: 'skype',
    phone: 'phone',
    linkedin: 'linkedin',
    linkedinId: 'linkedinId',
    connectionDegree: 'connectionDegree'
};

/* exported linkedinFields */
const linkedinFields = {
    skype: 'SKYPE',
    phone: 'phone',
    linkedin: 'linkedin',
    linkedinId: 'linkedinId',
    connectionDegree: 'connectionDegree',
    profile: 'profile',
    educationView: 'educationView',
    languageView: 'languageView'
};

/* exported profileFieldNames */
const profileFieldNames = {
    firstName: 'firstName',
    lastName: 'lastName',
    firstNameNative: 'firstNameNative',
    lastNameNative: 'lastNameNative',
    linkedinId: 'linkedinId',
    linkedinUrl: 'linkedinUrl',
    location: 'location',
    industry: 'industry',
    publicIdentifier: 'publicIdentifier',
    candidateInfoSource: 'candidateInfoSource',
    jobFamilyGroup: 'jobFamilyGroup',
    jobFamily: 'jobFamily',
    jobProfile: 'jobProfile',
    position: 'position',
    emails: 'emails',
    phones: 'phones',
    skypes: 'skypes',
    twitters: 'twitters',
    websites: 'websites',
    summary: 'summary',
    photoUrl: 'photoUrl',
    educations: 'educations',
    skills: 'skills',
    projects: 'projects',
    jobs: 'jobs',
    certificates: 'certificates',
    isLastSyncSuccessful: 'isLastSyncSuccessful',
    id: 'id',
    honors: 'honors',
    publications: 'publications',
    courses: 'courses',
    languages: 'languages'
};
// field names list for enrich call
const enrichCandidateFields = [
    profileFieldNames.firstName,
    profileFieldNames.lastName,
    profileFieldNames.linkedinId,
    profileFieldNames.linkedinUrl,
    profileFieldNames.location,
    profileFieldNames.industry,
    profileFieldNames.position,
    profileFieldNames.emails,
    profileFieldNames.phones,
    profileFieldNames.skypes,
    profileFieldNames.twitters,
    profileFieldNames.websites,
    profileFieldNames.summary,
    profileFieldNames.photoUrl,
    profileFieldNames.educations,
    profileFieldNames.skills,
    profileFieldNames.projects,
    profileFieldNames.jobs,
    profileFieldNames.certificates,
    profileFieldNames.honors,
    profileFieldNames.publications,
    profileFieldNames.courses,
    profileFieldNames.languages,
    profileFieldNames.isLastSyncSuccessful,
    profileFieldNames.id,
    profileFieldNames.publicIdentifier
];

/* exported candidateStatuses */
const candidateStatuses = {
    employee: 'Employee'
};

/* exported applicationStages */
const applicationStages = {
    potentialCandidate: 'Potential Candidate'
};

/* exported MSG */
const MSG = {
    handleError: 'handleError',
    profileFound: 'profileFound',
    searchPeoplePageFound: 'searchPeoplePageFound',
    isLoggedIn: 'isLoggedIn',
    notLoggedIn: 'notLoggedIn',
    searchCandidates: 'searchCandidates',
    addNewCandidate: 'addNewCandidate',
    getVacancies: 'getVacancies',
    getEditableCollections: 'getEditableCollections',
    getInfoSources: 'getInfoSources',
    getJobFamilyGroups: 'getJobFamilyGroups',
    getJobFamilies: 'getJobFamilies',
    getJobProfiles: 'getJobProfiles',
    addCandidateToCollection: 'addCandidateToCollection',
    getLastActivity: 'getLastActivity',
    assignToVacancy: 'assignToVacancy',
    getCollectionStages: 'getCollectionStages',
    assignToMe: 'assignToMe',
    deleteCollectionCard: 'deleteCollectionCard',
    moveCollectionCardToStage: 'moveCollectionCardToStage',
    enrichCandidate: 'enrichCandidate',
    reportError: 'reportError',
    installed: 'installed',
    showLoading: 'showLoading',
    navigateAway: 'navigateAway',
    clearProfile: 'clearProfile',
    unlink: 'unlink',
    getLinkedinPrimaryInfo: 'getLinkedinPrimaryInfo',
    getLinkedinProfileContactInfo: 'getLinkedinProfileContactInfo',
    getCandidatesWithOutdatedInfo: 'getCandidatesWithOutdatedInfo',
    transliterateName: 'transliterateName',
};

/* exported infoFormatting */
const infoFormatting = {
    n_a: 'N/A',
    empty: '--'
};

const infoSourceCategoryNames = {
    recruitment: 'Recruitment'
};

const infoSourceNames = {
    searchOnLinkedIn: 'Search on LinkedIn'
}
