const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PREDEFINED_SECURITY_QUESTIONS = [
  { id: 1, text: "What was your first pet's name?" },
  { id: 2, text: "What is your mother's maiden name?" },
  { id: 3, text: "What was the name of your elementary school?" },
  { id: 4, text: "In what city were you born?" }
  // Add more questions as needed, ensuring IDs are unique
];

function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role || (user.isAdmin ? 'admin' : 'user'),
    isAdmin: user.isAdmin || false,
    managerId: user.managerId || null,
    department: user.department || null,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Example: 1 hour expiration
}

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function normalizeAnswer(answer) {
  if (typeof answer !== 'string') return '';
  return answer.trim().toLowerCase();
}

async function hashAnswer(answer) {
  const normalized = normalizeAnswer(answer);
  // Use a suitable salt round, can be same as password or different
  // Consider if answers are typically shorter/less complex than passwords
  const saltRounds = 10;
  return bcrypt.hash(normalized, saltRounds);
}

async function compareAnswer(submittedAnswer, storedHash) {
  const normalizedSubmitted = normalizeAnswer(submittedAnswer);
  return bcrypt.compare(normalizedSubmitted, storedHash);
}

function getSecurityQuestions() {
  return PREDEFINED_SECURITY_QUESTIONS.map(q => ({ id: q.id, text: q.text }));
}

function getSecurityQuestionById(id) {
    const question = PREDEFINED_SECURITY_QUESTIONS.find(q => q.id === parseInt(id, 10));
    return question ? { id: question.id, text: question.text } : null;
}

function validatePasswordStrength(password) {
  const minLength = 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpper) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLower) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}


module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  PREDEFINED_SECURITY_QUESTIONS,
  getSecurityQuestions,
  getSecurityQuestionById,
  normalizeAnswer,
  hashAnswer,
  compareAnswer,
};