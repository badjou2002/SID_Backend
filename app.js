const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const newsRoutes = require('./routes/newsRoutes');
const companyRoutes = require('./routes/companyRoutes');
const errorHandler = require('./middlewares/errorHandler');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobFairRoutes = require('./routes/jobFairRoutes');
const aiRoutes = require('./routes/aiRoutes');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/job-fairs', jobFairRoutes);
app.use('/api/ai', aiRoutes);
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
