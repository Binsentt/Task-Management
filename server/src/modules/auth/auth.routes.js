import express from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import {
    availabilitySchema,
    registerSchema,
    loginSchema,
    resetRequestSchema,
    resetPasswordSchema
} from './auth.validation.js';
import {
    register,
    login,
    checkAvailability,
    requestPasswordReset,
    resetPassword,
    logout,
    me
} from './auth.controller.js';

const router = express.Router();

// 10 attempts per 15 minutes per IP, slows down password guessing
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, data: null, message: 'Too many attempts, try again later' }
});

const resetRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        data: null,
        message: 'Too many password reset requests. Try again later.'
    }
});

const availabilityLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        data: null,
        message: 'Too many availability checks. Try again later.'
    }
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/availability', availabilityLimiter, validate(availabilitySchema), checkAvailability);
router.post('/forgot-password', resetRequestLimiter, validate(resetRequestSchema), requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;