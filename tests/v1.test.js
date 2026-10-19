process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');

const { Role, OfferType, OfferStatus, ApplicationStatus } = require('../enums');
const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const CompanyProfile = require('../models/CompanyProfile');
const JobOffer = require('../models/JobOffer');
const Application = require('../models/Application');

const SECRET = process.env.JWT_ACCESS_SECRET;

const tokenFor = (user) =>
  jwt.sign({ userId: String(user._id), role: user.role }, SECRET, { expiresIn: '1h' });

const resolveDb = async () => {
  if (process.env.TEST_MONGO_URI) {
    return { uri: process.env.TEST_MONGO_URI, stop: async () => {} };
  }
  if (process.env.MONGO_URI) {
    const url = new URL(process.env.MONGO_URI);
    url.pathname = '/sid_test';
    return { uri: url.toString(), stop: async () => {} };
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  return { uri: mongod.getUri('sid_test'), stop: () => mongod.stop() };
};

describe('v1 candidate profile + applications', () => {
  let db;
  let app;
  let candidateUser;
  let otherCandidateUser;
  let recruiterUser;
  let otherRecruiterUser;
  let adminUser;
  let candidateProfile;
  let otherCandidateProfile;
  let company;
  let offerOpen1;
  let offerOpen2;
  let offerClosed;
  let candidateToken;
  let otherCandidateToken;
  let recruiterToken;
  let otherRecruiterToken;
  let adminToken;

  before(async () => {
    db = await resolveDb();
    await mongoose.connect(db.uri);
    app = require('../app');

    await Promise.all([
      User.deleteMany({}),
      CandidateProfile.deleteMany({}),
      CompanyProfile.deleteMany({}),
      JobOffer.deleteMany({}),
      Application.deleteMany({})
    ]);

    candidateUser = await User.create({
      email: 'candidate@test.dev',
      passwordHash: 'x',
      role: Role.CANDIDATE
    });
    otherCandidateUser = await User.create({
      email: 'candidate2@test.dev',
      passwordHash: 'x',
      role: Role.CANDIDATE
    });
    recruiterUser = await User.create({
      email: 'recruiter@test.dev',
      passwordHash: 'x',
      role: Role.RECRUITER
    });
    otherRecruiterUser = await User.create({
      email: 'recruiter2@test.dev',
      passwordHash: 'x',
      role: Role.RECRUITER
    });
    adminUser = await User.create({
      email: 'admin@test.dev',
      passwordHash: 'x',
      role: Role.ADMIN
    });

    candidateProfile = await CandidateProfile.create({
      user: candidateUser._id,
      fullName: 'Amine Ben Salah',
      phone: '+216 22 123 456',
      city: 'Sfax',
      rawCvUrl: '/uploads/cv/amine.pdf',
      parsedSkills: ['JavaScript', 'Node.js'],
      parsedExperiences: [{ title: 'Dev', company: 'Freelance', period: '2023-2025' }],
      parsedEducation: [{ degree: 'Master', school: 'ENIS', year: 2024 }],
      completenessScore: 85
    });
    otherCandidateProfile = await CandidateProfile.create({
      user: otherCandidateUser._id,
      fullName: 'Autre Candidat'
    });

    company = await CompanyProfile.create({
      user: recruiterUser._id,
      companyName: 'TechSfax'
    });

    offerOpen1 = await JobOffer.create({
      company: company._id,
      title: 'Dev Full Stack',
      type: OfferType.STAGE_PFE,
      description: 'Stage PFE',
      requiredSkills: ['JavaScript'],
      status: OfferStatus.OPEN
    });
    offerOpen2 = await JobOffer.create({
      company: company._id,
      title: 'Dev Backend',
      type: OfferType.EMPLOI,
      description: 'CDI',
      requiredSkills: ['Node.js'],
      status: OfferStatus.OPEN
    });
    offerClosed = await JobOffer.create({
      company: company._id,
      title: 'Poste ferme',
      type: OfferType.EMPLOI,
      description: 'Closed',
      status: OfferStatus.CLOSED
    });

    candidateToken = tokenFor(candidateUser);
    otherCandidateToken = tokenFor(otherCandidateUser);
    recruiterToken = tokenFor(recruiterUser);
    otherRecruiterToken = tokenFor(otherRecruiterUser);
    adminToken = tokenFor(adminUser);
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (db) await db.stop();
  });

  describe('GET /api/v1/profiles/candidate/me', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/profiles/candidate/me');
      assert.equal(res.status, 401);
      assert.ok(res.body.message);
    });

    it('returns 401 for a garbage token', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/candidate/me')
        .set('Authorization', 'Bearer not-a-token');
      assert.equal(res.status, 401);
    });

    it('returns 403 for a recruiter', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${recruiterToken}`);
      assert.equal(res.status, 403);
    });

    it('returns the full profile of the connected candidate', async () => {
      const res = await request(app)
        .get('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${candidateToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.fullName, 'Amine Ben Salah');
      assert.deepEqual(res.body.data.parsedSkills, ['JavaScript', 'Node.js']);
      assert.equal(res.body.data.parsedExperiences.length, 1);
      assert.equal(res.body.data.parsedEducation.length, 1);
      assert.equal(res.body.data.user.email, 'candidate@test.dev');
      assert.equal(res.body.data.user.passwordHash, undefined);
    });

    it('returns 404 when the candidate has no profile', async () => {
      const orphan = await User.create({
        email: 'orphan@test.dev',
        passwordHash: 'x',
        role: Role.CANDIDATE
      });
      const res = await request(app)
        .get('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${tokenFor(orphan)}`);
      assert.equal(res.status, 404);
      await User.deleteOne({ _id: orphan._id });
    });
  });

  describe('PUT /api/v1/profiles/candidate/me', () => {
    it('updates skills, formations and contact data, recomputing completeness', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          fullName: 'Amine Ben Salah',
          phone: '+216 99 111 222',
          city: 'Sousse',
          parsedSkills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
          parsedExperiences: [
            { title: 'Full Stack Developer', company: 'TechSfax', period: '2023-2025' },
            { title: 'Freelance', company: 'Self', period: '2021-2023' }
          ],
          parsedEducation: [{ degree: 'Master Informatique', school: 'ENIS Sfax', year: 2024 }]
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.city, 'Sousse');
      assert.equal(res.body.data.parsedSkills.length, 4);
      assert.equal(res.body.data.parsedExperiences.length, 2);
      assert.equal(res.body.data.completenessScore, 100);

      const persisted = await CandidateProfile.findById(candidateProfile._id);
      assert.equal(persisted.city, 'Sousse');
      assert.equal(persisted.parsedSkills.length, 4);
      assert.equal(persisted.completenessScore, 100);
    });

    it('rejects read-only fields with 400', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ rawCvUrl: '/uploads/cv/hack.pdf', completenessScore: 100 });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errors.length, 2);
    });

    it('rejects invalid payload types with 400', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ parsedSkills: 'not-an-array' });
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Validation failed');
    });

    it('returns 403 for a recruiter', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/candidate/me')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ city: 'Tunis' });
      assert.equal(res.status, 403);
    });
  });

  describe('POST /api/v1/applications', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .send({ jobOffer: offerOpen1._id, motivationLetter: 'Motivation' });
      assert.equal(res.status, 401);
    });

    it('returns 403 for a recruiter', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ jobOffer: offerOpen1._id, motivationLetter: 'Motivation' });
      assert.equal(res.status, 403);
    });

    it('rejects a missing motivation letter with 400', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: offerOpen2._id });
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'Validation failed');
    });

    it('rejects an invalid offer id with 400', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: 'not-an-id', motivationLetter: 'Motivation' });
      assert.equal(res.status, 400);
    });

    it('returns 404 for an unknown offer', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: new mongoose.Types.ObjectId(), motivationLetter: 'Motivation' });
      assert.equal(res.status, 404);
    });

    it('returns 409 for a closed offer', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: offerClosed._id, motivationLetter: 'Motivation' });
      assert.equal(res.status, 409);
    });

    it('submits an application with custom CV and letter', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          jobOffer: offerOpen1._id,
          customCvUrl: '/uploads/cv/custom.pdf',
          motivationLetter: 'Je souhaite rejoindre votre equipe.'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, ApplicationStatus.PENDING);
      assert.equal(res.body.data.isValidatedByCandidate, true);
      assert.equal(res.body.data.customCvUrl, '/uploads/cv/custom.pdf');
      assert.equal(res.body.data.jobOffer.title, 'Dev Full Stack');
      assert.equal(res.body.data.jobOffer.company.companyName, 'TechSfax');
      assert.equal(res.body.data.matchScore, null);
    });

    it('returns 409 on duplicate application', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: offerOpen1._id, motivationLetter: 'Encore une fois' });
      assert.equal(res.status, 409);
    });
  });

  describe('GET /api/v1/applications/my-applications', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/applications/my-applications');
      assert.equal(res.status, 401);
    });

    it('returns only the connected candidate applications, newest first', async () => {
      await Application.create({
        candidate: otherCandidateProfile._id,
        jobOffer: offerOpen2._id,
        motivationLetter: 'Autre candidature',
        isValidatedByCandidate: true
      });
      await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ jobOffer: offerOpen2._id, motivationLetter: 'Deuxieme candidature' });

      const res = await request(app)
        .get('/api/v1/applications/my-applications')
        .set('Authorization', `Bearer ${candidateToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      const ids = res.body.data.map((a) => String(a.candidate));
      assert.ok(ids.every((id) => id === String(candidateProfile._id)));
      for (let i = 1; i < res.body.data.length; i += 1) {
        assert.ok(
          new Date(res.body.data[i - 1].createdAt) >= new Date(res.body.data[i].createdAt)
        );
      }
      assert.ok(res.body.data.every((a) => a.jobOffer && a.jobOffer.title));
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my-applications?status=PENDING')
        .set('Authorization', `Bearer ${candidateToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((a) => a.status === ApplicationStatus.PENDING));
    });

    it('rejects an unknown status filter with 400', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my-applications?status=WHATEVER')
        .set('Authorization', `Bearer ${candidateToken}`);
      assert.equal(res.status, 400);
    });
  });

  describe('PATCH /api/v1/applications/:id/status', () => {
    let targetId;

    const statusOf = async (id, status, token) =>
      request(app)
        .patch(`/api/v1/applications/${id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });

    before(async () => {
      const application = await Application.findOne({
        candidate: candidateProfile._id,
        jobOffer: offerOpen1._id
      });
      targetId = application._id;
    });

    it('returns 403 for a candidate', async () => {
      const res = await statusOf(targetId, ApplicationStatus.REVIEWED, candidateToken);
      assert.equal(res.status, 403);
    });

    it('returns 403 for another recruiter', async () => {
      const res = await statusOf(targetId, ApplicationStatus.REVIEWED, otherRecruiterToken);
      assert.equal(res.status, 403);
    });

    it('rejects PENDING as a target status with 400', async () => {
      const res = await statusOf(targetId, ApplicationStatus.PENDING, recruiterToken);
      assert.equal(res.status, 400);
    });

    it('rejects an invalid application id with 400', async () => {
      const res = await statusOf('not-an-id', ApplicationStatus.REVIEWED, recruiterToken);
      assert.equal(res.status, 400);
    });

    it('returns 404 for an unknown application id', async () => {
      const res = await statusOf(
        new mongoose.Types.ObjectId(),
        ApplicationStatus.REVIEWED,
        recruiterToken
      );
      assert.equal(res.status, 404);
    });

    it('lets the owning recruiter mark the application REVIEWED then ACCEPTED', async () => {
      const first = await statusOf(targetId, ApplicationStatus.REVIEWED, recruiterToken);
      assert.equal(first.status, 200);
      assert.equal(first.body.data.status, ApplicationStatus.REVIEWED);
      assert.equal(first.body.data.jobOffer.title, 'Dev Full Stack');

      const second = await statusOf(targetId, ApplicationStatus.ACCEPTED, recruiterToken);
      assert.equal(second.status, 200);
      assert.equal(second.body.data.status, ApplicationStatus.ACCEPTED);

      const persisted = await Application.findById(targetId);
      assert.equal(persisted.status, ApplicationStatus.ACCEPTED);
    });

    it('lets an admin reject an application', async () => {
      const otherApplication = await Application.findOne({
        candidate: otherCandidateProfile._id
      });
      const res = await statusOf(otherApplication._id, ApplicationStatus.REJECTED, adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, ApplicationStatus.REJECTED);
    });
  });

  describe('GET /api/v1/profiles (all)', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/profiles');
      assert.equal(res.status, 401);
    });

    it('returns 403 for a candidate', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .set('Authorization', `Bearer ${candidateToken}`);
      assert.equal(res.status, 403);
    });

    it('returns every candidate profile for a recruiter', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .set('Authorization', `Bearer ${recruiterToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2);

      const own = res.body.data.find((p) => String(p._id) === String(candidateProfile._id));
      assert.ok(own, 'profil du candidat présent');
      assert.equal(own.user.email, 'candidate@test.dev');
      assert.equal(own.cvEmbedding, undefined);
      assert.ok(own.completenessScore >= 0);
    });

    it('returns the same list for an admin', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 2);
    });

    it('filters with ?q=', async () => {
      const hit = await request(app)
        .get('/api/v1/profiles?q=Sousse')
        .set('Authorization', `Bearer ${recruiterToken}`);
      assert.equal(hit.status, 200);
      assert.equal(hit.body.data.length, 1);
      assert.equal(hit.body.data[0].city, 'Sousse');

      const miss = await request(app)
        .get('/api/v1/profiles?q=zzzz-no-match')
        .set('Authorization', `Bearer ${recruiterToken}`);
      assert.equal(miss.status, 200);
      assert.equal(miss.body.data.length, 0);
    });

    it('rejects an invalid ?q= with 400', async () => {
      const res = await request(app)
        .get('/api/v1/profiles')
        .query({ q: 'x'.repeat(150) })
        .set('Authorization', `Bearer ${recruiterToken}`);
      assert.equal(res.status, 400);
    });
  });
});
