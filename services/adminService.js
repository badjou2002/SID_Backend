const Application = require('../models/Application');
const CompanyNews = require('../models/CompanyNews');
const Conversation = require('../models/Conversation');
const JobFair = require('../models/JobFair');
const JobOffer = require('../models/JobOffer');
const Message = require('../models/Message');
const { ApplicationStatus, ConversationType, OfferStatus } = require('../enums');

const getAdminNews = () => CompanyNews.find()
  .select('title content mediaType isPublished createdAt company')
  .populate('company', 'companyName logo')
  .sort({ createdAt: -1 });

const getDashboardStats = async () => {
  const now = new Date();
  const [
    totalJobs,
    openJobs,
    totalApplications,
    pendingApplications,
    totalNews,
    publishedNews,
    totalJobFairs,
    upcomingJobFairs
  ] = await Promise.all([
    JobOffer.countDocuments(),
    JobOffer.countDocuments({ status: OfferStatus.OPEN }),
    Application.countDocuments(),
    Application.countDocuments({ status: ApplicationStatus.PENDING }),
    CompanyNews.countDocuments(),
    CompanyNews.countDocuments({ isPublished: true }),
    JobFair.countDocuments(),
    JobFair.countDocuments({ startDate: { $gte: now } })
  ]);

  return {
    jobs: { total: totalJobs, open: openJobs },
    applications: { total: totalApplications, pending: pendingApplications },
    news: { total: totalNews, published: publishedNews },
    jobFairs: { total: totalJobFairs, upcoming: upcomingJobFairs }
  };
};

const STOP_WORDS = new Set([
  'a', 'à', 'ai', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du',
  'elle', 'en', 'et', 'eux', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur',
  'lui', 'ma', 'mais', 'me', 'même', 'mes', 'moi', 'mon', 'ne', 'nos', 'notre',
  'nous', 'on', 'ou', 'par', 'pas', 'pour', 'qu', 'que', 'qui', 'sa', 'se',
  'ses', 'son', 'sur', 'ta', 'te', 'tes', 'toi', 'ton', 'tu', 'un', 'une',
  'vos', 'votre', 'vous', 'c', 'd', 'j', 'l', 'm', 'n', 's', 't', 'y',
  'the', 'and', 'are', 'for', 'from', 'have', 'how', 'is', 'it', 'of', 'on',
  'or', 'that', 'this', 'to', 'was', 'what', 'when', 'with', 'you', 'your'
]);

const createWordCounter = (text, counter) => {
  const words = text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [];
  for (const word of words) {
    if (word.length > 1 && !STOP_WORDS.has(word)) {
      counter.set(word, (counter.get(word) || 0) + 1);
    }
  }
};

const topCounts = (counter, limit) => [...counter]
  .map(([name, count]) => ({ name, count }))
  .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
  .slice(0, limit);

const insightsPipeline = (startDate, endDate) => [
  { $match: { sentAt: { $gte: startDate, $lte: endDate } } },
  {
    $lookup: {
      from: Conversation.collection.name,
      localField: 'conversation',
      foreignField: '_id',
      as: 'conversationInfo'
    }
  },
  { $unwind: '$conversationInfo' },
  { $match: { 'conversationInfo.type': ConversationType.AI_ASSISTANT } },
  { $project: { conversation: 1, role: 1, content: 1, rating: 1, sentiment: 1, topics: 1 } }
];

const getAiInsights = async (days) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  const topicCounts = new Map();
  const wordCounts = new Map();
  const conversationIds = new Set();
  let messageCount = 0;
  let ratingTotal = 0;
  let ratingCount = 0;

  const cursor = Message.aggregate(insightsPipeline(startDate, endDate))
    .cursor({ batchSize: 500 });

  for await (const message of cursor) {
    messageCount += 1;
    conversationIds.add(String(message.conversation));

    if (typeof message.content === 'string') {
      createWordCounter(message.content, wordCounts);
    }

    for (const topic of message.topics || []) {
      if (typeof topic === 'string' && topic.trim()) {
        const normalizedTopic = topic.trim();
        topicCounts.set(normalizedTopic, (topicCounts.get(normalizedTopic) || 0) + 1);
      }
    }

    if (Object.hasOwn(sentiments, message.sentiment)) {
      sentiments[message.sentiment] += 1;
    }

    if (
      message.role === 'assistant'
      && Number.isInteger(message.rating)
      && message.rating >= 1
      && message.rating <= 5
    ) {
      ratingDistribution[message.rating] += 1;
      ratingTotal += message.rating;
      ratingCount += 1;
    }
  }

  return {
    periodDays: days,
    totals: { conversations: conversationIds.size, messages: messageCount },
    topTopics: topCounts(topicCounts, 10),
    wordCloud: topCounts(wordCounts, 20),
    sentiments,
    assistantRatings: {
      average: ratingCount ? Number((ratingTotal / ratingCount).toFixed(2)) : null,
      count: ratingCount,
      distribution: ratingDistribution
    }
  };
};

const getJobFairs = () => JobFair.find().sort({ startDate: 1 });

const createJobFair = (data) => JobFair.create({
  name: data.name,
  location: data.location,
  organizer: data.organizer,
  startDate: data.startDate,
  endDate: data.endDate,
  companiesCount: data.companiesCount,
  participantsCount: data.participantsCount
});

module.exports = {
  getAdminNews,
  getDashboardStats,
  getAiInsights,
  getJobFairs,
  createJobFair
};
