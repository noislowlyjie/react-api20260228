const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const orderService = require('../services/orderService');
const checkoutService = require('../services/checkoutService');
const AuthenticateWithJWT = require('../middlewares/AuthenticateWithJWT');

router.post('/', AuthenticateWithJWT, async (req, res) => {
    try {
        const session = await checkoutService.checkout(req.userId);
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;