const express = require('express');
const { protect } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/userController'); 

const router = express.Router();

// The route handler arguments (getProfile, updateProfile) are now verified functions
router.route('/profile').get(protect, getProfile).put(protect, updateProfile);

module.exports = router;