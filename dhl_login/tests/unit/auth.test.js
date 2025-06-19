/**
 * Unit Tests for Authentication Utilities
 */

const {
    hashPassword,
    verifyPassword,
    hashAnswer,
    verifyAnswer,
    getSecurityQuestions,
    getSecurityQuestionById
} = require('../../utils/auth');

describe('Authentication Utilities', () => {
    describe('Password Hashing', () => {
        it('should hash passwords correctly', async () => {
            const password = 'testPassword123';
            const hash = await hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
        });

        it('should generate different hashes for same password', async () => {
            const password = 'testPassword123';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);

            expect(hash1).not.toBe(hash2);
        });

        it('should verify correct passwords', async () => {
            const password = 'testPassword123';
            const hash = await hashPassword(password);
            const isValid = await verifyPassword(password, hash);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect passwords', async () => {
            const password = 'testPassword123';
            const wrongPassword = 'wrongPassword456';
            const hash = await hashPassword(password);
            const isValid = await verifyPassword(wrongPassword, hash);

            expect(isValid).toBe(false);
        });

        it('should handle empty passwords', async () => {
            await expect(hashPassword('')).rejects.toThrow();
        });

        it('should handle null passwords', async () => {
            await expect(hashPassword(null)).rejects.toThrow();
        });
    });

    describe('Security Answer Hashing', () => {
        it('should hash security answers correctly', async () => {
            const answer = 'My first pet was Fluffy';
            const hash = await hashAnswer(answer);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(answer);
            expect(hash.length).toBeGreaterThan(50);
        });

        it('should normalize answers before hashing', async () => {
            const answer1 = 'My First Pet Was Fluffy';
            const answer2 = 'my first pet was fluffy';
            const answer3 = '  MY FIRST PET WAS FLUFFY  ';

            const hash1 = await hashAnswer(answer1);
            const hash2 = await hashAnswer(answer2);
            const hash3 = await hashAnswer(answer3);

            // All should verify against the same normalized answer
            const normalizedAnswer = 'my first pet was fluffy';
            const isValid1 = await verifyAnswer(normalizedAnswer, hash1);
            const isValid2 = await verifyAnswer(normalizedAnswer, hash2);
            const isValid3 = await verifyAnswer(normalizedAnswer, hash3);

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(true);
            expect(isValid3).toBe(true);
        });

        it('should verify correct security answers', async () => {
            const answer = 'Blue';
            const hash = await hashAnswer(answer);
            const isValid = await verifyAnswer('blue', hash); // Case insensitive

            expect(isValid).toBe(true);
        });

        it('should reject incorrect security answers', async () => {
            const answer = 'Blue';
            const wrongAnswer = 'Red';
            const hash = await hashAnswer(answer);
            const isValid = await verifyAnswer(wrongAnswer, hash);

            expect(isValid).toBe(false);
        });
    });

    describe('Security Questions', () => {
        it('should return array of security questions', () => {
            const questions = getSecurityQuestions();

            expect(Array.isArray(questions)).toBe(true);
            expect(questions.length).toBeGreaterThan(0);
            
            questions.forEach(question => {
                expect(question).toHaveProperty('id');
                expect(question).toHaveProperty('question');
                expect(typeof question.id).toBe('string');
                expect(typeof question.question).toBe('string');
            });
        });

        it('should have unique question IDs', () => {
            const questions = getSecurityQuestions();
            const ids = questions.map(q => q.id);
            const uniqueIds = [...new Set(ids)];

            expect(ids.length).toBe(uniqueIds.length);
        });

        it('should return specific question by ID', () => {
            const questions = getSecurityQuestions();
            const firstQuestion = questions[0];
            const foundQuestion = getSecurityQuestionById(firstQuestion.id);

            expect(foundQuestion).toBeDefined();
            expect(foundQuestion.id).toBe(firstQuestion.id);
            expect(foundQuestion.question).toBe(firstQuestion.question);
        });

        it('should return null for invalid question ID', () => {
            const invalidQuestion = getSecurityQuestionById('invalid-id');
            expect(invalidQuestion).toBeNull();
        });

        it('should handle empty or null question ID', () => {
            expect(getSecurityQuestionById('')).toBeNull();
            expect(getSecurityQuestionById(null)).toBeNull();
            expect(getSecurityQuestionById(undefined)).toBeNull();
        });
    });

    describe('Input Validation', () => {
        it('should handle special characters in passwords', async () => {
            const specialPassword = 'P@ssw0rd!#$%^&*()';
            const hash = await hashPassword(specialPassword);
            const isValid = await verifyPassword(specialPassword, hash);

            expect(isValid).toBe(true);
        });

        it('should handle unicode characters', async () => {
            const unicodePassword = 'пароль123';
            const hash = await hashPassword(unicodePassword);
            const isValid = await verifyPassword(unicodePassword, hash);

            expect(isValid).toBe(true);
        });

        it('should handle very long passwords', async () => {
            const longPassword = 'a'.repeat(1000);
            const hash = await hashPassword(longPassword);
            const isValid = await verifyPassword(longPassword, hash);

            expect(isValid).toBe(true);
        });

        it('should handle security answers with special characters', async () => {
            const specialAnswer = 'My pet\'s name was "Fluffy"!';
            const hash = await hashAnswer(specialAnswer);
            const isValid = await verifyAnswer('my pet\'s name was "fluffy"!', hash);

            expect(isValid).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid hash formats in password verification', async () => {
            const password = 'testPassword123';
            const invalidHash = 'not-a-valid-hash';

            await expect(verifyPassword(password, invalidHash)).rejects.toThrow();
        });

        it('should handle invalid hash formats in answer verification', async () => {
            const answer = 'test answer';
            const invalidHash = 'not-a-valid-hash';

            await expect(verifyAnswer(answer, invalidHash)).rejects.toThrow();
        });

        it('should handle undefined inputs gracefully', async () => {
            await expect(hashPassword(undefined)).rejects.toThrow();
            await expect(hashAnswer(undefined)).rejects.toThrow();
            await expect(verifyPassword(undefined, 'hash')).rejects.toThrow();
            await expect(verifyAnswer(undefined, 'hash')).rejects.toThrow();
        });
    });
});
