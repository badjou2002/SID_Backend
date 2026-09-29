const Role = Object.freeze({
  CANDIDATE: 'CANDIDATE',
  RECRUITER: 'RECRUITER',
  ADMIN: 'ADMIN'
});

const OfferType = Object.freeze({
  STAGE_PFE: 'STAGE_PFE',
  STAGE_PERIODE: 'STAGE_PERIODE',
  EMPLOI: 'EMPLOI'
});

const OfferStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
});

const ApplicationStatus = Object.freeze({
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
});

const MediaType = Object.freeze({
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  VIDEO: 'VIDEO'
});

const ConversationType = Object.freeze({
  AI_ASSISTANT: 'AI_ASSISTANT',
  DIRECT_CHAT: 'DIRECT_CHAT'
});

module.exports = {
  Role,
  OfferType,
  OfferStatus,
  ApplicationStatus,
  MediaType,
  ConversationType
};
