require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Role, OfferType, OfferStatus, ApplicationStatus, MediaType, ConversationType } = require('../enums');
const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const CompanyProfile = require('../models/CompanyProfile');
const CompanyNews = require('../models/CompanyNews');
const JobOffer = require('../models/JobOffer');
const Application = require('../models/Application');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      CandidateProfile.deleteMany({}),
      CompanyProfile.deleteMany({}),
      CompanyNews.deleteMany({}),
      JobOffer.deleteMany({}),
      Application.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({})
    ]);
    logger.info('Collections cleared');

    const candidateUser = await User.create({
      email: 'candidate@jci.test',
      passwordHash: '$2b$10$hashedpasswordplaceholder',
      role: Role.CANDIDATE
    });

    const recruiterUser = await User.create({
      email: 'recruiter@jci.test',
      passwordHash: '$2b$10$hashedpasswordplaceholder',
      role: Role.RECRUITER
    });

    const adminUser = await User.create({
      email: 'admin@jci.test',
      passwordHash: '$2b$10$hashedpasswordplaceholder',
      role: Role.ADMIN
    });

    const candidateProfile = await CandidateProfile.create({
      user: candidateUser._id,
      fullName: 'Amine Ben Salah',
      phone: '+216 22 123 456',
      city: 'Sfax',
      rawCvUrl: '/uploads/cv/amine_bensalah.pdf',
      parsedSkills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
      parsedExperiences: [
        { title: 'Full Stack Developer', company: 'Freelance', period: '2023 - 2025' }
      ],
      parsedEducation: [
        { degree: 'Master Informatique', school: 'ENIS Sfax', year: 2024 }
      ],
      cvEmbedding: [0.12, 0.98, 0.45, 0.67],
      completenessScore: 85,
      isNewCandidate: false
    });

    const companyProfile = await CompanyProfile.create({
      user: recruiterUser._id,
      companyName: 'TechSfax Solutions',
      sector: 'Software Development',
      address: 'Route de Tunis, Sfax 3000',
      description: 'Startup spécialisée dans le développement web et mobile.',
      isVerified: true
    });

    const jobOffer1 = await JobOffer.create({
      company: companyProfile._id,
      title: 'Développeur Full Stack (Stage PFE)',
      type: OfferType.STAGE_PFE,
      description: 'Recherche étudiant en Master pour stage PFE sur une application SaaS.',
      requiredSkills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
      offerEmbedding: [0.15, 0.95, 0.42, 0.7],
      status: OfferStatus.OPEN
    });

    const jobOffer2 = await JobOffer.create({
      company: companyProfile._id,
      title: 'Développeur Backend Node.js',
      type: OfferType.EMPLOI,
      description: 'Poste CDI pour le développement d\'APIs REST en Node.js/Express.',
      requiredSkills: ['Node.js', 'Express', 'MongoDB', 'Docker'],
      offerEmbedding: [0.2, 0.9, 0.5, 0.65],
      status: OfferStatus.OPEN
    });

    await Application.create({
      candidate: candidateProfile._id,
      jobOffer: jobOffer1._id,
      customCvUrl: '/uploads/cv/amine_custom.pdf',
      motivationLetter: 'Je souhaite mettre en pratique mes compétences full stack durant mon PFE.',
      matchScore: 87,
      aiJustification: 'Fortes correspondances sur Node.js, React et MongoDB.',
      status: ApplicationStatus.PENDING,
      isValidatedByCandidate: true
    });

    await CompanyNews.create({
      title: 'TechSfax recrute pour 2026',
      content: 'Nous ouvrons plusieurs postes en développement web et IA.',
      mediaUrl: '/uploads/news/techsfax_2026.jpg',
      mediaType: MediaType.IMAGE,
      isPublished: true,
      company: companyProfile._id
    });

    const conversation = await Conversation.create({
      user: candidateUser._id,
      type: ConversationType.AI_ASSISTANT
    });

    await Message.create({
      conversation: conversation._id,
      senderId: candidateUser._id,
      content: 'Bonjour, quels postes correspondent à mon profil ?',
      metadata: {},
      sentAt: new Date()
    });

    logger.info('Seed data created', {
      users: 3,
      candidateProfiles: 1,
      companyProfiles: 1,
      jobOffers: 2,
      applications: 1,
      news: 1,
      conversations: 1,
      messages: 1
    });

    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', { error: error.message });
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

seed();
